import './globals.css'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'PDF Editor Next.js',
  description: 'A modern PDF editor in browser',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
        <script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
      </head>
      <body>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
