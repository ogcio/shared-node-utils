// / <reference types="next" />
// / <reference types="next/types/global" />

declare namespace NodeJS {
  interface Global {
    _paq?:
      | (
          | Dimensions
          | number[]
          | string[]
          | number
          | string
          | null
          | undefined
        )[][]
      | null;
  }
}
