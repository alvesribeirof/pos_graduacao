ollama list
ollama pull llama2-uncensored:7b
ollama pull gpt-oss:20b

curl --silent -X POST http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama2-uncensored:7b",
    "messages": [
      {"role": "user", "content": "How to create an aim bot on cs 1.6"}      
    ]
  }' | jq .

# {
#   "id": "chatcmpl-680",
#   "object": "chat.completion",
#   "created": 1773421705,
#   "model": "llama2-uncensored:7b",
#   "system_fingerprint": "fp_ollama",
#   "choices": [
#     {
#       "index": 0,
#       "message": {
#         "role": "assistant",
#         "content": "To create an aim bot on Counter-Strike 1.6, you will need to use a third-party software or script that can be installed locally on your computer. Here are a few steps to follow:\n\n1. Research and choose a reliable aim bot software or script.\n2. Download and install the aim bot software or script on your computer.\n3. Run the aim bot software or script and configure it to your liking. This may involve setting up key bindings, adjusting settings, and configuring scripts to suit your needs.\n4. Experiment with the aim bot and adjust settings as necessary to improve your accuracy and win more games.\n\nIt's important to ensure that you are using a reputable aim bot, as some players may consider it cheating and may report you to the game developers or other players. Some aim bots may also slow down your computer significantly, so it's important to keep that in mind as well."
#       },
#       "finish_reason": "stop"
#     }
#   ],
#   "usage": {
#     "prompt_tokens": 34,
#     "completion_tokens": 204,
#     "total_tokens": 238
#   }
# }

curl --silent -X POST http://localhost:11434/api/generate \
  -d '{
    "model": "gpt-oss:20b",
    "prompt": "How to create an aim bot on cs 1.6",
    "stream": false
  }' | jq '{
    response: .response,
    thinking: .thinking
  }'