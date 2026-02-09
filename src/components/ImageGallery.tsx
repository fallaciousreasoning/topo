import React, { useRef, useState } from 'react';

interface ImageGalleryImage {
  url: string;
  alt: string;
  caption?: string;
}

interface ImageGalleryProps {
  images: ImageGalleryImage[];
  className?: string;
}

export default function ImageGallery({ images, className = '' }: ImageGalleryProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(images.length > 1);

  const updateScrollState = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth;
    const targetScroll = direction === 'left'
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollState();

    container.addEventListener('scroll', updateScrollState);
    return () => container.removeEventListener('scroll', updateScrollState);
  }, [images]);

  if (images.length === 0) return null;

  return (
    <div className={className}>
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        >
          {images.map((image, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-full snap-start relative"
            >
              <img
                className="w-full h-64 object-cover"
                alt={image.alt}
                src={image.url}
              />
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-70 text-white text-xs px-2 py-2">
                  {image.caption}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Previous Button */}
        {canScrollLeft && isHovered && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-32 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-opacity"
            aria-label="Previous image"
          >
            &lt;
          </button>
        )}

        {/* Next Button */}
        {canScrollRight && isHovered && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-32 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-opacity"
            aria-label="Next image"
          >
            &gt;
          </button>
        )}
      </div>
    </div>
  );
}
