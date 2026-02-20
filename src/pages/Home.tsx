import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Home.css'

export default function Home() {
  const [roomCode, setRoomCode] = useState(['', '', '', ''])
  const [userName, setUserName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ]

  useEffect(() => {
    const savedName = localStorage.getItem('userName')
    if (savedName) {
      setUserName(savedName)
    }
  }, [])

  const handleCodeChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return

    const newCode = [...roomCode]
    newCode[index] = value

    setRoomCode(newCode)
    setError('')

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !roomCode[index] && index > 0) {
      inputRefs[index - 1].current?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    const newCode = pastedData.split('').concat(['', '', '', '']).slice(0, 4)
    setRoomCode(newCode)
    
    // Focus the next empty input or last input
    const nextEmptyIndex = newCode.findIndex(val => !val)
    if (nextEmptyIndex !== -1) {
      inputRefs[nextEmptyIndex].current?.focus()
    } else {
      inputRefs[3].current?.focus()
    }
  }

  const handleJoinRoom = () => {
    if (!userName.trim()) {
      setError('Please enter your name')
      return
    }
    const code = roomCode.join('')
    if (code.length === 4) {
      localStorage.setItem('userName', userName.trim())
      setError('')
      navigate(`/room/${code}`, { state: { isCreator: false, userName: userName.trim() } })
    } else {
      setError('Please enter a 4-digit code')
    }
  }

  const handleCreateRoom = () => {
    if (!userName.trim()) {
      setError('Please enter your name')
      return
    }
    localStorage.setItem('userName', userName.trim())
    setError('')
    navigate('/create', { state: { userName: userName.trim() } })
  }

  const handleNameChange = (value: string) => {
    setUserName(value)
    setError('')
    if (!isEditingName && value.trim() !== '') {
      setIsEditingName(true)
    }
  }

  const handleNameSave = () => {
    if (userName.trim()) {
      localStorage.setItem('userName', userName.trim())
      setIsEditingName(false)
    }
  }

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="title">File Droper V2</h1>
        <p className="subtitle">Share files instantly with anyone</p>
        
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="options-container">
          <div className="name-section">
            <label className="input-label">Your Name</label>
            <div className="name-input-group">
              <input
                type="text"
                placeholder="Enter your name"
                maxLength={20}
                value={userName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="name-input"
                readOnly={!isEditingName && userName.trim() !== ''}
              />
              {userName.trim() !== '' && (
                <button 
                  className="edit-name-btn"
                  onClick={() => {
                    if (isEditingName) {
                      handleNameSave()
                    } else {
                      setIsEditingName(true)
                    }
                  }}
                >
                  {isEditingName ? '✓' : '✏️'}
                </button>
              )}
            </div>
          </div>

          <button 
            className="btn btn-primary"
            onClick={handleCreateRoom}
          >
            <span className="btn-icon">+</span>
            Create Room
          </button>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="join-section">
            <label className="input-label">Room Code</label>
            <div className="code-boxes" onPaste={handlePaste}>
              {roomCode.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="code-box"
                  placeholder="0"
                />
              ))}
            </div>
            <button 
              className="btn btn-secondary"
              onClick={handleJoinRoom}
              disabled={roomCode.join('').length !== 4}
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
