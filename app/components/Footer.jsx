import Image from 'next/image';
import Link from 'next/link';
import logo from '@/public/logo.svg';

export default function Footer() {
  return (<>
    <div className='flex flex-wrap md:flex-row justify-center pt-4 pb-2 px-10 items-center text-center text-gray-500 text-sm'>
      All assembly features shown on this page apply only to the content of 
      <Link 
        href="https://study.auckland.ac.nz/ords/r/uoa/catalogue/course?p6_code=COMPSCI%20110" 
        target="_blank" 
        rel="noopener noreferrer"
        className="underline mx-1.5 whitespace-nowrap"
      >
        UoA COMPSCI 110
      </Link> course.
    </div>
    <div className='flex flex-col md:flex-row justify-center pb-4 min-h-12 items-center text-gray-500 gap-2 md:gap-0'>
      <div className="flex items-center">
        <span>Made by</span>
        <div className="relative w-32 h-10 mx-2">
          <Link href="https://dpp.qzz.io" className="relative block h-full w-full hover:scale-95 duration-300">
            <Image src={logo} alt="Logo" fill className="object-contain" />
          </Link>
        </div>
      </div>

      {/* Hide the small dot separator on mobile devices */}
      <div className="hidden md:block mx-3 h-1 w-1 rounded-full bg-gray-400" aria-hidden="true" />

      <div className="flex items-center">
        <span className="mr-1.5">Open-sourced at</span>
        <Link 
          href="https://github.com/DiamondPie/assembly-sim" 
          target="_blank" 
          className="hover:text-(--text-secondary) transition-colors duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"/></svg>
        </Link>
      </div>
    </div>
  </>);
}