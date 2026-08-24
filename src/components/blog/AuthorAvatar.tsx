import Image from 'next/image'

interface AuthorAvatarProps {
  avatar: string
  authorName: string
  variant?: 'card' | 'about'
}

function isImageAvatar(avatar: string): boolean {
  return avatar.startsWith('/') || /^https?:\/\//i.test(avatar)
}

export function AuthorAvatar({ avatar, authorName, variant = 'card' }: AuthorAvatarProps) {
  const className = variant === 'about' ? 'about-avatar' : 'author-avatar'

  return (
    <div className={className}>
      {isImageAvatar(avatar) ? (
        <Image
          src={avatar}
          alt={`${authorName} 的狗狗头像`}
          fill
          sizes={variant === 'about' ? '112px' : '76px'}
          className="object-cover"
          priority={variant === 'about'}
        />
      ) : (
        <span aria-hidden="true">{avatar}</span>
      )}
    </div>
  )
}
