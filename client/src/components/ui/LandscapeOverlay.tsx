export function LandscapeOverlay() {
  return (
    <div className="landscape-required">
      <div className="text-egyptian-gold text-6xl mb-6">📱</div>
      <h1 className="text-2xl font-bold text-egyptian-gold mb-4">
        Rotate Your Device
      </h1>
      <p className="text-papyrus text-lg mb-2">
        Please rotate your device to landscape mode
      </p>
      <p className="text-egyptian-gold text-xl" dir="rtl">
        من فضلك قم بتدوير جهازك
      </p>
      <div className="mt-8 animate-bounce">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-16 w-16 text-egyptian-gold transform rotate-90" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" 
          />
        </svg>
      </div>
    </div>
  );
}
