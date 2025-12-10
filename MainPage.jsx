import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Download, Cpu, Code } from 'lucide-react';

const CodeAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('Welcome to Linux Simulator\nType commands to test code\n$ ');
  const [terminalInput, setTerminalInput] = useState('');
  const [fileSystem, setFileSystem] = useState({});
  const [currentDir, setCurrentDir] = useState('/home/user');
  const chatEndRef = useRef(null);
  const terminalEndRef = useRef(null);

  const models = [
    { provider: 'OpenAI', name: 'GPT-OSS-20B', id: 'openai-community/gpt2', cost: 2 },
    { provider: 'OpenAI', name: 'GPT-OSS-120B', id: 'openai-community/gpt2-large', cost: 8 },
    { provider: 'Nova', name: 'Algorix-Skyhigh', id: 'arthu1/Algorix-Skyhigh', cost: 1 },
    { provider: 'Alibaba', name: 'Qwen3-Coder-0.5B', id: 'Qwen/Qwen2.5-Coder-0.5B-Instruct', cost: 0.5 },
    { provider: 'Alibaba', name: 'Qwen3-Coder-1.5B', id: 'Qwen/Qwen2.5-Coder-1.5B-Instruct', cost: 1.5 },
    { provider: 'Alibaba', name: 'Qwen3-Coder-3B', id: 'Qwen/Qwen2.5-Coder-3B-Instruct', cost: 3 },
    { provider: 'Alibaba', name: 'Qwen3-Coder-7B', id: 'Qwen/Qwen2.5-Coder-7B-Instruct', cost: 7 },
    { provider: 'Alibaba', name: 'Qwen3-Coder-14B', id: 'Qwen/Qwen2.5-Coder-14B-Instruct', cost: 14 }
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  const executeCommand = (cmd) => {
    const parts = cmd.trim().split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    let output = '';

    switch (command) {
      case 'ls':
        const dir = fileSystem[currentDir] || {};
        output = Object.keys(dir).length > 0 ? Object.keys(dir).join('  ') : 'outputs/';
        break;
      
      case 'pwd':
        output = currentDir;
        break;
      
      case 'cat':
        if (args.length === 0) {
          output = 'cat: missing file operand';
        } else {
          const fileName = args[0];
          const file = fileSystem[currentDir]?.[fileName];
          output = file ? file.content : `cat: ${fileName}: No such file or directory`;
        }
        break;
      
      case 'python':
      case 'python3':
        if (args.length === 0) {
          output = 'Python 3.11.0\n>>> (interactive mode not supported, use: python script.py)';
        } else {
          const fileName = args[0];
          const file = fileSystem[currentDir]?.[fileName];
          if (file && file.content) {
            output = `Executing ${fileName}...\n[Simulated output]\nScript completed successfully`;
          } else {
            output = `python: can't open file '${fileName}': [Errno 2] No such file or directory`;
          }
        }
        break;
      
      case 'node':
        if (args.length === 0) {
          output = 'Welcome to Node.js v20.0.0\n> (interactive mode not supported, use: node script.js)';
        } else {
          const fileName = args[0];
          const file = fileSystem[currentDir]?.[fileName];
          if (file && file.content) {
            output = `Executing ${fileName}...\n[Simulated output]\nScript completed successfully`;
          } else {
            output = `node: cannot open file '${fileName}'`;
          }
        }
        break;
      
      case 'mkdir':
        if (args.length === 0) {
          output = 'mkdir: missing operand';
        } else {
          const dirName = args[0];
          setFileSystem(prev => ({
            ...prev,
            [currentDir]: { ...(prev[currentDir] || {}), [dirName]: { type: 'dir' } }
          }));
          output = '';
        }
        break;
      
      case 'cd':
        if (args.length === 0 || args[0] === '~') {
          setCurrentDir('/home/user');
          output = '';
        } else if (args[0] === '..') {
          const parts = currentDir.split('/').filter(Boolean);
          parts.pop();
          setCurrentDir('/' + parts.join('/') || '/home/user');
          output = '';
        } else {
          output = `cd: ${args[0]}: No such file or directory`;
        }
        break;
      
      case 'clear':
        setTerminalOutput('$ ');
        return;
      
      case 'help':
        output = 'Available commands:\n  ls, pwd, cat, python, node, mkdir, cd, clear, help';
        break;
      
      default:
        output = `${command}: command not found`;
    }

    setTerminalOutput(prev => prev + cmd + '\n' + (output ? output + '\n' : '') + '$ ');
  };

  const generateResponse = async (prompt) => {
    if (!selectedModel) {
      alert('Please select a model first!');
      return;
    }

    setIsGenerating(true);
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: `You are a helpful coding assistant using the ${selectedModel.name} model. The user has access to a Linux terminal simulator.
              
If you create code files, format them like this:
FILENAME: example.py
\`\`\`python
print("Hello World")
\`\`\`

User request: ${prompt}`
            }
          ]
        })
      });

      const data = await response.json();
      const assistantMessage = data.content[0].text;

      // Parse for files
      const fileRegex = /FILENAME:\s*(\S+)\s*```(\w+)?\n([\s\S]+?)```/g;
      let match;
      const newFiles = {};

      while ((match = fileRegex.exec(assistantMessage)) !== null) {
        const [, filename, , content] = match;
        newFiles[filename] = { type: 'file', content: content.trim() };
      }

      if (Object.keys(newFiles).length > 0) {
        setFileSystem(prev => ({
          ...prev,
          [`${currentDir}/outputs`]: { ...(prev[`${currentDir}/outputs`] || {}), ...newFiles }
        }));
      }

      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message}. Using simulated response.\n\nHere's a sample Python function:\n\nFILENAME: hello.py\n\`\`\`python\ndef greet(name):\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("World"))\n\`\`\``
      }]);
      
      // Add simulated file
      setFileSystem(prev => ({
        ...prev,
        [`${currentDir}/outputs`]: {
          ...(prev[`${currentDir}/outputs`] || {}),
          'hello.py': { type: 'file', content: 'def greet(name):\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("World"))' }
        }
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    generateResponse(input);
    setInput('');
  };

  const handleTerminalSubmit = () => {
    if (!terminalInput.trim()) return;
    executeCommand(terminalInput);
    setTerminalInput('');
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-4">
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6">
          <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
            <Code className="w-8 h-8" />
            Code Assistant AI
          </h1>
          
          {/* Model Selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model)}
                className={`p-3 rounded-lg transition-all ${
                  selectedModel?.id === model.id
                    ? 'bg-white text-purple-700 shadow-lg scale-105'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <div className="text-xs opacity-80 uppercase">{model.provider}</div>
                <div className="text-sm font-semibold">{model.name}</div>
                <div className="text-xs">Cost: {model.cost}x</div>
              </button>
            ))}
          </div>
          
          <div className="text-sm bg-white/20 rounded-lg p-2">
            {selectedModel ? `✅ ${selectedModel.name} selected` : '⚠️ Select a model to start'}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Section */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-3xl p-4 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white border border-gray-200'
                  }`}>
                    <div className="text-xs font-semibold mb-2 opacity-70">
                      {msg.role === 'user' ? 'You' : `🤖 ${selectedModel?.name || 'Assistant'}`}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me to write code..."
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-full focus:outline-none focus:border-purple-500"
                disabled={!selectedModel || isGenerating}
              />
              <button
                onClick={handleSend}
                disabled={!selectedModel || isGenerating}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-full font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Send
              </button>
            </div>
          </div>

          {/* Terminal Section */}
          <div className="w-96 bg-gray-900 text-green-400 flex flex-col">
            <div className="bg-gray-800 p-3 flex items-center gap-2 text-white">
              <Terminal className="w-5 h-5" />
              <span className="font-semibold">Linux Simulator</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
              <pre className="whitespace-pre-wrap">{terminalOutput}</pre>
              <div ref={terminalEndRef} />
            </div>

            <div className="p-3 bg-gray-800 flex gap-2">
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTerminalSubmit()}
                placeholder="Type command..."
                className="flex-1 px-3 py-2 bg-gray-700 text-green-400 rounded border border-gray-600 focus:outline-none focus:border-green-500 font-mono"
              />
            </div>

            {/* File System */}
            <div className="bg-gray-800 p-3 border-t border-gray-700 max-h-48 overflow-y-auto">
              <div className="text-white font-semibold mb-2 text-sm">📁 outputs/</div>
              {Object.entries(fileSystem[`${currentDir}/outputs`] || {}).map(([filename, file]) => (
                <div key={filename} className="flex items-center justify-between mb-1 text-xs">
                  <span className="text-blue-400">{filename}</span>
                  <button
                    onClick={() => downloadFile(filename, file.content)}
                    className="text-green-400 hover:text-green-300 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeAssistant;
