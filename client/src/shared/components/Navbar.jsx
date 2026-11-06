function Navbar({ user }) {
  return (
    <header className="navbar">
      <span>{user.name}</span>
      <span className="role-badge">{user.role}</span>
    </header>
  )
}

export default Navbar
