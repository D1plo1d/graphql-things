const UnauthorizedAccess = () => {
  const error = new Error('Unauthorized Access')
  error.unauthorized = true
  return error
}

export default UnauthorizedAccess
