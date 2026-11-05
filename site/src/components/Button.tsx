import Link from 'next/link'
import clsx from 'clsx'

const baseStyles = {
  solid:
    'inline-flex justify-center rounded-md py-1 px-4 text-base font-semibold tracking-tight shadow-sm',
  outline:
    'inline-flex justify-center rounded-md border py-[calc(--spacing(1)-1px)] px-[calc(--spacing(4)-1px)] text-base font-semibold tracking-tight',
}

const variantStyles = {
  solid: {
    slate:
      'bg-slate-900 text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:bg-slate-700 active:text-white/80 disabled:opacity-30 disabled:hover:bg-slate-900',
    blue: 'bg-brand-600 text-white hover:bg-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:bg-brand-700 active:text-white/80 disabled:opacity-30 disabled:hover:bg-brand-600',
    white:
      'bg-white text-brand-600 hover:text-brand-700 focus-visible:text-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:bg-brand-50 active:text-brand-900/80 disabled:opacity-40 disabled:hover:text-brand-600',
  },
  outline: {
    slate:
      'border-slate-200 text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 active:border-slate-200 active:bg-slate-50 active:text-slate-900/70 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent',
    blue: 'border-brand-300 text-brand-600 hover:border-brand-400 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:text-brand-600/70 disabled:opacity-40 disabled:hover:border-brand-300 disabled:hover:bg-transparent',
  },
}

type ButtonProps = (
  | {
      variant?: 'solid'
      color?: keyof typeof variantStyles.solid
    }
  | {
      variant: 'outline'
      color?: keyof typeof variantStyles.outline
    }
) &
  (
    | Omit<React.ComponentPropsWithoutRef<typeof Link>, 'color'>
    | (Omit<React.ComponentPropsWithoutRef<'button'>, 'color'> & {
        href?: undefined
      })
  )

export function Button({ className, ...props }: ButtonProps) {
  props.variant ??= 'solid'
  props.color ??= 'slate'

  className = clsx(
    baseStyles[props.variant],
    props.variant === 'outline'
      ? variantStyles.outline[props.color]
      : props.variant === 'solid'
        ? variantStyles.solid[props.color]
        : undefined,
    className,
  )

  if (typeof props.href === 'undefined') {
    return <button className={className} {...props} />
  }
  // The app under /app/ is not a Next.js route: link to it with a plain anchor
  // so that Next.js does not try to prefetch it.
  if (typeof props.href === 'string' && props.href.startsWith('/app/')) {
    let { href, ...rest } = props as React.ComponentPropsWithoutRef<'a'>
    return <a className={className} href={href} {...rest} />
  }
  return <Link className={className} {...props} />
}
