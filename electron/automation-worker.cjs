let AndroidDevice, AndroidAgent, getConnectedDevices
try {
  const mod = require('@midscene/android')
  AndroidDevice = mod.AndroidDevice
  AndroidAgent = mod.AndroidAgent
  getConnectedDevices = mod.getConnectedDevices
  if (process.send) process.send({ type: 'log', message: '@midscene/android 加载成功', status: 'done' })
} catch (err) {
  if (process.send) process.send({ type: 'error', message: `加载 @midscene/android 失败: ${err.message}` })
  process.exit(1)
}

process.on('message', async (msg) => {
  if (msg.type !== 'run') return
  const { script, deviceId, aiConfig } = msg

  process.env.MIDSCENE_MODEL_BASE_URL = aiConfig.baseUrl
  process.env.MIDSCENE_MODEL_API_KEY = aiConfig.apiKey
  process.env.MIDSCENE_MODEL_NAME = aiConfig.modelName
  process.env.MIDSCENE_MODEL_FAMILY = aiConfig.modelFamily || 'openai'

  const send = (type, data) => process.send({ type, ...data })

  try {
    send('log', { message: '正在连接设备...', status: 'running' })
    const device = new AndroidDevice(deviceId)
    await device.connect()
    send('log', { message: '设备已连接', status: 'done' })

    send('log', { message: '正在初始化 AI Agent...', status: 'running' })
    const agent = new AndroidAgent(device, {
      aiActionContext: 'If any permission popup appears, click allow/agree.'
    })
    send('log', { message: 'Agent 就绪', status: 'done' })

    const wrappedScript = `return (async (agent) => {\n${script}\n})(agent)`
    const fn = new Function('agent', 'send', wrappedScript)

    const originalAiAct = agent.aiAct.bind(agent)
    const originalAiAssert = agent.aiAssert.bind(agent)
    const originalAiQuery = agent.aiQuery.bind(agent)
    const originalAiWaitFor = agent.aiWaitFor.bind(agent)
    let stepCount = 0

    agent.aiAct = async (instruction) => {
      const step = ++stepCount
      send('log', { message: `aiAct: ${instruction}`, status: 'running', step })
      const start = Date.now()
      try {
        const r = await originalAiAct(instruction)
        send('log', { message: `aiAct: ${instruction}`, status: 'passed', step, duration: ((Date.now() - start) / 1000).toFixed(1) + 's' })
        return r
      } catch (err) {
        send('log', { message: `aiAct: ${instruction} — ${err.message}`, status: 'failed', step, duration: ((Date.now() - start) / 1000).toFixed(1) + 's' })
        throw err
      }
    }

    agent.aiAssert = async (condition) => {
      const step = ++stepCount
      send('log', { message: `aiAssert: ${condition}`, status: 'running', step })
      const start = Date.now()
      try {
        const r = await originalAiAssert(condition)
        send('log', { message: `aiAssert: ${condition}`, status: 'passed', step, duration: ((Date.now() - start) / 1000).toFixed(1) + 's' })
        return r
      } catch (err) {
        send('log', { message: `aiAssert: ${condition} — ${err.message}`, status: 'failed', step, duration: ((Date.now() - start) / 1000).toFixed(1) + 's' })
        throw err
      }
    }

    agent.aiQuery = async (schema) => {
      const step = ++stepCount
      const desc = typeof schema === 'string' ? schema : JSON.stringify(schema)
      send('log', { message: `aiQuery: ${desc}`, status: 'running', step })
      const start = Date.now()
      try {
        const r = await originalAiQuery(schema)
        send('log', { message: `aiQuery: ${desc}`, status: 'passed', step, duration: ((Date.now() - start) / 1000).toFixed(1) + 's', result: JSON.stringify(r) })
        return r
      } catch (err) {
        send('log', { message: `aiQuery: ${desc} — ${err.message}`, status: 'failed', step, duration: ((Date.now() - start) / 1000).toFixed(1) + 's' })
        throw err
      }
    }

    agent.aiWaitFor = async (condition) => {
      const step = ++stepCount
      send('log', { message: `aiWaitFor: ${condition}`, status: 'running', step })
      const start = Date.now()
      try {
        const r = await originalAiWaitFor(condition)
        send('log', { message: `aiWaitFor: ${condition}`, status: 'passed', step, duration: ((Date.now() - start) / 1000).toFixed(1) + 's' })
        return r
      } catch (err) {
        send('log', { message: `aiWaitFor: ${condition} — ${err.message}`, status: 'failed', step, duration: ((Date.now() - start) / 1000).toFixed(1) + 's' })
        throw err
      }
    }

    await fn(agent, send)

    let reportHtml = ''
    try { reportHtml = await agent.reportHTMLString({ inlineScreenshots: true }) } catch {}

    if (device.disconnect) await device.disconnect()
    else if (device.close) await device.close()
    send('done', { message: '脚本执行完毕', reportHtml })
  } catch (err) {
    let reportHtml = ''
    try { reportHtml = await agent.reportHTMLString({ inlineScreenshots: true }) } catch {}
    send('error', { message: err.message, reportHtml })
  }
})
