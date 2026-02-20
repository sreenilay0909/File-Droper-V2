import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/CreateRoom.css'

export default function CreateRoom() {
  const [roomName, setRoomName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const userName = location.state?.userName || 'Anonymous'

  const generateRoomCode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return
    
    setIsCreating(true)
    const roomCode = generateRoomCode()
    
    setTimeout(() => {
      navigate(`/room/${roomCode}`, { state: { roomName: roomName.trim(), isCreator: true, userName } })
    }, 500)
  }

  return (
    <div className="create-container">
      <div className="create-card">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
        
        <h1 className="title">Create New Room</h1>
        <p className="subtitle">Give your room a name</p>

        <div className="form-container">
          <input
            type="text"
            placeholder="Room name (e.g., Team Files)"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="room-input"
            maxLength={30}
          />
          
          <button 
            className="btn-create"
            onClick={handleCreateRoom}
            disabled={!roomName.trim() || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </div>
    </div>
  )
}
