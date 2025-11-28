import { useState, useEffect, useRef } from 'react'

function ChatArea({ messages, onSendChat, canTalkToAll }) {
  const [input, setInput] = useState('')
  const [target, setTarget] = useState('ALL')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (input.trim()) {
      onSendChat(input.trim(), target)
      setInput('')
    }
  }

  return (
    <>
      <div className="chat-area">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.type || ''}`}>
            {msg.type === 'system' ? (
              <div>{msg.text}</div>
            ) : (
              <>
                <div className="sender">
                  {msg.sender}
                  <span className="target"> → {msg.target}</span>
                </div>
                <div>{msg.text}</div>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          disabled={!canTalkToAll && target === 'ALL'}
        >
          <option value="ALL" disabled={!canTalkToAll}>ALL</option>
          <option value="Selected">Selected Room</option>
        </select>
        <input
          type="text"
          placeholder="Type message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">SEND</button>
      </form>
    </>
  )
}

export default ChatArea
