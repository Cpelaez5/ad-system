export const logger = {
  debug: (prefixOrMessage, ...args) => {
    if (import.meta.env.DEV) {
      if (args.length > 0) {
        console.debug(prefixOrMessage, ...args)
      } else {
        console.debug(prefixOrMessage)
      }
    }
  },
  info: (prefixOrMessage, ...args) => {
    if (import.meta.env.DEV) {
      if (args.length > 0) {
        console.info(prefixOrMessage, ...args)
      } else {
        console.info(prefixOrMessage)
      }
    }
  },
  warn: (prefixOrMessage, ...args) => {
    if (args.length > 0) {
      console.warn(prefixOrMessage, ...args)
    } else {
      console.warn(prefixOrMessage)
    }
  },
  error: (prefixOrMessage, ...args) => {
    if (args.length > 0) {
      console.error(prefixOrMessage, ...args)
    } else {
      console.error(prefixOrMessage)
    }
  }
}
