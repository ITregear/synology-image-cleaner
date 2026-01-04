import ConnectionIndicator from './ConnectionIndicator'

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-sh-bg">
      <nav className="border-b border-sh-border bg-sh-bg-secondary/50 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between px-8 py-4">
          <h1 className="text-xl font-bold text-sh-text tracking-tight">
            Synology Image Cleaner
          </h1>
          <ConnectionIndicator />
        </div>
      </nav>
      <main className="flex-1 mt-[73px]">
        {children}
      </main>
    </div>
  )
}

export default Layout


