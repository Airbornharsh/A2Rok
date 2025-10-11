export const getTerminalToken = () => {
  const terminalToken = localStorage.getItem('a2rok_terminalToken')
  return terminalToken
}

export const setTerminalToken = (terminalToken: string) => {
  if (terminalToken) {
    localStorage.setItem('a2rok_terminalToken', terminalToken)
  }
}
