import React from 'react'

interface StatusBarButtonProps {
    onClick: () => void
    title: string
    children: React.ReactNode
    border?: boolean
    size?: 'normal' | 'large'
}

export default function StatusBarButton({ onClick, title, children, border = true, size = 'normal' }: StatusBarButtonProps) {
    const borderClass = border ? 'border' : ''
    const sizeClasses = size === 'large'
        ? 'text-xl px-2 py-1'
        : 'text-xs px-1 py-0.5'

    return (
        <button
            onClick={onClick}
            className={`${sizeClasses} ${borderClass} rounded transition-all pointer-events-auto hover:bg-gray-200 active:bg-gray-300`}
            title={title}
        >
            {children}
        </button>
    )
}
