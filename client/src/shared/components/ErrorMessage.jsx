function ErrorMessage({ message, onRetry }) {
  return (
    <section className="error-message" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  )
}

export default ErrorMessage
