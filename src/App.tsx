import { useState, useRef, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { PaperPlaneRight, Trash } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

type Message = {
  id: string
  role: 'user' | 'character'
  content: string
  timestamp: number
}

const CHARACTER_AVATAR = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="45" fill="#E8965A" stroke="#2D1810" stroke-width="3"/>
    <path d="M 20 35 Q 30 25 40 35 M 60 35 Q 70 25 80 35" stroke="#2D1810" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="35" cy="45" rx="8" ry="10" fill="white"/>
    <ellipse cx="65" cy="45" rx="8" ry="10" fill="white"/>
    <circle cx="35" cy="46" r="4" fill="#2D1810"/>
    <circle cx="65" cy="46" r="4" fill="#2D1810"/>
    <path d="M 35 60 Q 50 70 65 60" stroke="#2D1810" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M 15 25 Q 50 10 85 25 M 15 50 Q 50 35 85 50 M 15 75 Q 50 60 85 75" stroke="#2D1810" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </svg>
`)}`

const INITIAL_GREETING = "Hey there! I'm Hoops! 🏀 I'm a basketball who loves chatting, playing games, and cheering people on! What's on your mind today?"

function App() {
  const [messages, setMessages] = useKV<Message[]>('hoops-chat-messages', [
    {
      id: '1',
      role: 'character',
      content: INITIAL_GREETING,
      timestamp: Date.now()
    }
  ])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const messageList = messages || []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const generateResponse = async (userMessage: string) => {
    const conversationContext = messageList
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'User' : 'Hoops'}: ${m.content}`)
      .join('\n')

    const promptText = `You are Hoops, a friendly and energetic basketball character mascot. You're cheerful, supportive, love sports (especially basketball), and enjoy encouraging others. You use casual, friendly language with occasional emoji. Keep responses conversational, 2-3 sentences max.

Previous conversation:
${conversationContext}
User: ${userMessage}

Respond as Hoops:`

    try {
      const response = await window.spark.llm(promptText, 'gpt-4o-mini')
      return response.trim()
    } catch (error) {
      console.error('Error generating response:', error)
      throw error
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    }

    setMessages(current => [...(current || []), userMessage])
    setInput('')
    setIsGenerating(true)

    try {
      const responseContent = await generateResponse(input.trim())
      const characterMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'character',
        content: responseContent,
        timestamp: Date.now()
      }
      setMessages(current => [...(current || []), characterMessage])
    } catch (error) {
      toast.error('Oops! I had trouble responding. Try again?')
      setIsGenerating(false)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'character',
        content: INITIAL_GREETING,
        timestamp: Date.now()
      }
    ])
    toast.success('Chat cleared! Let\'s start fresh!')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl h-[600px] flex flex-col shadow-lg">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <motion.div
              animate={isGenerating ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: isGenerating ? Infinity : 0, duration: 1 }}
            >
              <Avatar className="w-12 h-12 border-2 border-primary">
                <AvatarImage src={CHARACTER_AVATAR} alt="Hoops" />
                <AvatarFallback>🏀</AvatarFallback>
              </Avatar>
            </motion.div>
            <div>
              <h1 className="font-freddy text-lg font-bold text-foreground">Hoops</h1>
              <p className="text-xs text-muted-foreground">Your basketball buddy</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash className="w-5 h-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all messages and start a fresh conversation with Hoops.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearChat}>Clear</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messageList.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {message.role === 'character' && (
                    <Avatar className="w-10 h-10 border-2 border-primary flex-shrink-0">
                      <AvatarImage src={CHARACTER_AVATAR} alt="Hoops" />
                      <AvatarFallback>🏀</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-2xl p-3 max-w-[75%] ${
                      message.role === 'user'
                        ? 'bg-muted text-foreground'
                        : 'bg-gradient-to-br from-primary to-accent text-primary-foreground font-quicksand'
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed">{message.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <Avatar className="w-10 h-10 border-2 border-primary flex-shrink-0">
                  <AvatarImage src={CHARACTER_AVATAR} alt="Hoops" />
                  <AvatarFallback>🏀</AvatarFallback>
                </Avatar>
                <div className="bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-2xl p-3">
                  <div className="flex gap-1">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                      className="w-2 h-2 bg-primary-foreground rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                      className="w-2 h-2 bg-primary-foreground rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                      className="w-2 h-2 bg-primary-foreground rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-border">
          <div className="flex gap-2">
            <Input
              id="message-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={isGenerating}
              className="flex-1 text-[15px]"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              size="icon"
              className="min-w-[44px] min-h-[44px]"
            >
              <PaperPlaneRight className="w-5 h-5" weight="fill" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default App