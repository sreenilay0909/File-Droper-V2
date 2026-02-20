import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import Modal from '../components/Modal'
import '../styles/Room.css'

interface FileData {
  id: string
  name: string
  size: number
  type: string
  data: string
  sender: string
  timestamp: number
}

interface User {
  id: string
  name: string
  isHost: boolean
}

export default function Room() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [files, setFiles] = useState<FileData[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [users, setUsers] = useState<User[]>([])
  const [roomName, setRoomName] = useState('')
  const [error, setError] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [showNamePrompt, setShowNamePrompt] = useState(false)
  const [tempUserName, setTempUserName] = useState('')
  const [modal, setModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'info' | 'confirm' | 'warning'
    onConfirm?: () => void
    onCancel?: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })
  const socketRef = useRef<Socket | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const userName = location.state?.userName || tempUserName

  useEffect(() => {
    // Check if user came via direct link (no userName in state)
    if (!location.state?.userName) {
      const savedName = localStorage.getItem('userName')
      if (savedName) {
        setTempUserName(savedName)
        setShowNamePrompt(false)
      } else {
        setShowNamePrompt(true)
        return
      }
    }

    const serverUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:4000'
    
    socketRef.current = io(serverUrl)
    
    const isCreator = location.state?.isCreator
    const initialRoomName = location.state?.roomName || 'Room'
    
    if (isCreator) {
      socketRef.current.emit('create-room', { roomCode, roomName: initialRoomName, userName }, (success: boolean) => {
        if (!success) {
          setError('Room code already exists. Please try again.')
          setTimeout(() => navigate('/create', { state: { userName } }), 2000)
        } else {
          setRoomName(initialRoomName)
          setIsHost(true)
        }
      })
    } else {
      socketRef.current.emit('join-room', { roomCode, userName }, (success: boolean, data?: { files: FileData[], roomName: string }) => {
        if (!success) {
          setError('Room does not exist. Please check the code.')
          setTimeout(() => navigate('/'), 2000)
        } else if (data) {
          setFiles(data.files)
          setRoomName(data.roomName)
        }
      })
    }

    socketRef.current.on('users-update', (usersList: User[]) => {
      setUsers(usersList)
    })

    socketRef.current.on('file-shared', (fileData: FileData) => {
      setFiles(prev => [...prev, fileData])
    })

    socketRef.current.on('file-deleted', (fileId: string) => {
      setFiles(prev => prev.filter(f => f.id !== fileId))
    })

    socketRef.current.on('user-removed', () => {
      setModal({
        isOpen: true,
        title: 'Removed from Room',
        message: 'You have been removed from the room by the host',
        type: 'warning',
        onConfirm: () => navigate('/')
      })
    })

    socketRef.current.on('room-ended', () => {
      setModal({
        isOpen: true,
        title: 'Room Ended',
        message: 'The host has ended this room',
        type: 'info',
        onConfirm: () => navigate('/')
      })
    })

    socketRef.current.on('file-error', (data: { message: string }) => {
      setModal({
        isOpen: true,
        title: 'Upload Error',
        message: data.message,
        type: 'warning',
        onConfirm: () => setModal({ ...modal, isOpen: false })
      })
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [roomCode, location.state, navigate, userName, showNamePrompt])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      Array.from(selectedFiles).forEach(file => {
        if (file.size > 100 * 1024 * 1024) {
          setModal({
            isOpen: true,
            title: 'File Too Large',
            message: `${file.name} is too large. Maximum file size is 100MB.`,
            type: 'warning',
            onConfirm: () => setModal({ ...modal, isOpen: false })
          })
        } else {
          processFile(file)
        }
      })
    }
  }

  const processFile = (file: File) => {
    const fileId = Date.now().toString() + Math.random()
    
    
    // For small files (< 1MB), send directly
    if (file.size < 1024 * 1024) {
      const reader = new FileReader()
      reader.onload = () => {
        const fileData: FileData = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          data: reader.result as string,
          sender: userName,
          timestamp: Date.now()
        }
        
        socketRef.current?.emit('share-file', { roomCode, fileData })
        setFiles(prev => [...prev, fileData])
      }
      reader.readAsDataURL(file)
    } else {
      // For large files, use chunked upload
      uploadLargeFile(file, fileId)
    }
  }

  const uploadLargeFile = (file: File, fileId: string) => {
    const chunkSize = 512 * 1024 // 512KB chunks
    let offset = 0
    const chunks: string[] = []
    
    setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + chunkSize)
      const reader = new FileReader()
      
      reader.onload = (e) => {
        chunks.push(e.target?.result as string)
        offset += chunkSize
        
        const progress = Math.min((offset / file.size) * 100, 100)
        setUploadProgress(prev => ({ ...prev, [fileId]: progress }))
        
        if (offset < file.size) {
          readNextChunk()
        } else {
          // All chunks read, combine and send
          const fullDataUrl = chunks.join('')
          const fileData: FileData = {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            data: fullDataUrl,
            sender: userName,
            timestamp: Date.now()
          }
          
          socketRef.current?.emit('share-file', { roomCode, fileData })
          setFiles(prev => [...prev, fileData])
          
          // Clear progress after a delay
          setTimeout(() => {
            setUploadProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[fileId]
              return newProgress
            })
          }, 1000)
        }
      }
      
      reader.onerror = () => {
        setModal({
          isOpen: true,
          title: 'Upload Failed',
          message: `Failed to upload ${file.name}. Please try again.`,
          type: 'warning',
          onConfirm: () => setModal({ ...modal, isOpen: false })
        })
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[fileId]
          return newProgress
        })
      }
      
      reader.readAsDataURL(slice)
    }
    
    readNextChunk()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = e.dataTransfer.files
    Array.from(droppedFiles).forEach(file => {
      if (file.size > 100 * 1024 * 1024) {
        setModal({
          isOpen: true,
          title: 'File Too Large',
          message: `${file.name} is too large. Maximum file size is 100MB.`,
          type: 'warning',
          onConfirm: () => setModal({ ...modal, isOpen: false })
        })
      } else {
        processFile(file)
      }
    })
  }

  const downloadFile = (file: FileData) => {
    const link = document.createElement('a')
    link.href = file.data
    link.download = file.name
    link.click()
  }

  const handleNameSubmit = () => {
    if (!tempUserName.trim()) {
      return
    }
    localStorage.setItem('userName', tempUserName.trim())
    setShowNamePrompt(false)
    window.location.reload()
  }

  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/room/${roomCode}`
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(roomLink).then(() => {
        setModal({
          isOpen: true,
          title: 'Link Copied!',
          message: 'Room link has been copied to clipboard',
          type: 'info',
          onConfirm: () => setModal({ ...modal, isOpen: false })
        })
      }).catch(() => {
        fallbackCopyToClipboard(roomLink)
      })
    } else {
      fallbackCopyToClipboard(roomLink)
    }
  }

  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      setModal({
        isOpen: true,
        title: 'Link Copied!',
        message: 'Room link has been copied to clipboard',
        type: 'info',
        onConfirm: () => setModal({ ...modal, isOpen: false })
      })
    } catch (err) {
      setModal({
        isOpen: true,
        title: 'Copy Failed',
        message: `Please copy manually: ${text}`,
        type: 'warning',
        onConfirm: () => setModal({ ...modal, isOpen: false })
      })
    }
    
    document.body.removeChild(textArea)
  }

  const deleteFile = (fileId: string) => {
    if (!isHost) return
    socketRef.current?.emit('delete-file', { roomCode, fileId })
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const deleteMyFile = (fileId: string) => {
    socketRef.current?.emit('delete-file', { roomCode, fileId })
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const removeUser = (userId: string) => {
    if (!isHost) return
    setModal({
      isOpen: true,
      title: 'Remove User',
      message: 'Are you sure you want to remove this user from the room?',
      type: 'confirm',
      onConfirm: () => {
        socketRef.current?.emit('remove-user', { roomCode, userId })
        setModal({ ...modal, isOpen: false })
      },
      onCancel: () => setModal({ ...modal, isOpen: false })
    })
  }

  const endRoom = () => {
    if (!isHost) return
    setModal({
      isOpen: true,
      title: 'End Room',
      message: 'Are you sure you want to end this room? All users will be disconnected.',
      type: 'warning',
      onConfirm: () => {
        socketRef.current?.emit('end-room', roomCode)
        navigate('/')
      },
      onCancel: () => setModal({ ...modal, isOpen: false })
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (type: string, name: string): string => {
    // Images
    if (type.startsWith('image/')) return '🖼️'
    
    // Videos
    if (type.startsWith('video/')) return '🎥'
    
    // Audio
    if (type.startsWith('audio/')) return '🎵'
    
    // Documents
    if (type.includes('pdf') || name.endsWith('.pdf')) return '📕'
    if (type.includes('word') || name.match(/\.(doc|docx)$/i)) return '📘'
    if (type.includes('excel') || name.match(/\.(xls|xlsx|csv)$/i)) return '📊'
    if (type.includes('powerpoint') || name.match(/\.(ppt|pptx)$/i)) return '📙'
    if (type.includes('text') || name.match(/\.(txt|md|log)$/i)) return '📝'
    
    // Archives
    if (name.match(/\.(zip|rar|7z|tar|gz|bz2)$/i)) return '📦'
    
    // Code files
    if (name.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|h|css|html|json|xml|yml|yaml)$/i)) return '💻'
    
    // Executables
    if (name.match(/\.(exe|dmg|app|apk|deb|rpm)$/i)) return '⚙️'
    
    // Default
    return '📄'
  }

  

  return (
    <div className="room-container">
      {showNamePrompt && (
        <div className="name-prompt-overlay">
          <div className="name-prompt-card">
            <h2 className="prompt-title">Welcome!</h2>
            <p className="prompt-subtitle">Please enter your name to join this room</p>
            <input
              type="text"
              placeholder="Your name"
              maxLength={20}
              value={tempUserName}
              onChange={(e) => setTempUserName(e.target.value)}
              className="prompt-input"
              onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
              autoFocus
            />
            <button 
              className="prompt-btn"
              onClick={handleNameSubmit}
              disabled={!tempUserName.trim()}
            >
              Join Room
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
      
      <div className="room-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            ← Leave
          </button>
        </div>
        <div className="room-info">
          <h2>{roomName} {isHost && <span className="host-badge">Host</span>}</h2>
          <div className="room-code">
            Code: <span>{roomCode}</span>
            <button className="copy-btn" onClick={copyRoomLink} title="Copy room link">
              🔗
            </button>
          </div>
        </div>
        <div className="header-actions">
          <div className="users-count">{users.length} user{users.length !== 1 ? 's' : ''}</div>
          {isHost && (
            <button className="end-room-btn" onClick={endRoom}>
              End Room
            </button>
          )}
        </div>
      </div>

      <div className="room-content">
        <div className="users-sidebar">
          <h3 className="sidebar-title">Users in Room</h3>
          <div className="users-list">
            {users.map(user => (
              <div key={user.id} className={`user-item ${user.isHost ? 'host' : ''}`}>
                <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <div className="user-info">
                  <div className="user-name">{user.name}</div>
                  {user.isHost && <span className="host-label">Host</span>}
                </div>
                {isHost && !user.isHost && (
                  <button 
                    className="remove-user-btn"
                    onClick={() => removeUser(user.id)}
                    title="Remove user"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div 
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {isDragging && (
          <div className="drag-overlay">
            <div className="drag-content">
              <div className="drag-icon">📤</div>
              <h3>Drop files to share</h3>
            </div>
          </div>
        )}

        {files.length === 0 ? (
          <div className="empty-state">
            <div className="upload-icon">📁</div>
            <h3>Drop files here or click to upload</h3>
            <p>Share files with everyone in this room</p>
            <p className="file-limit">Maximum file size: 100MB</p>
            <button 
              className="btn btn-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              Select Files
            </button>
          </div>
        ) : (
          <>
            {Object.keys(uploadProgress).length > 0 && (
              <div className="upload-progress-container">
                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                  <div key={fileId} className="upload-progress-item">
                    <div className="progress-info">
                      <span>Uploading...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="files-grid">
            {files.map(file => (
              <div key={file.id} className="file-card">
                <div className="file-icon">
                  {getFileIcon(file.type, file.name)}
                </div>
                <div className="file-info">
                  <div className="file-name" title={file.name}>{file.name}</div>
                  <div className="file-meta">
                    <span className="file-size">{formatFileSize(file.size)}</span>
                    <span className="file-dot">•</span>
                    <span className="file-sender">{file.sender === userName ? 'You' : file.sender}</span>
                  </div>
                </div>
                <div className="file-actions">
                  <button 
                    className="download-btn"
                    onClick={() => downloadFile(file)}
                    title="Download"
                  >
                    ↓
                  </button>
                  {(isHost || file.sender === userName) && (
                    <button 
                      className="delete-btn"
                      onClick={() => isHost ? deleteFile(file.id) : deleteMyFile(file.id)}
                      title="Delete file"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          </>
        )}
        
        {files.length > 0 && (
          <button 
            className="fab"
            onClick={() => fileInputRef.current?.click()}
          >
            +
          </button>
        )}
        </div>
      </div>

      <Modal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
        confirmText={modal.type === 'confirm' || modal.type === 'warning' ? 'Yes' : 'OK'}
        cancelText="No"
      />
    </div>
  )
}
