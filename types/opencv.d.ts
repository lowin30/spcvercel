declare global {
  interface Window {
    cv: {
      imread: (canvas: HTMLCanvasElement) => any
      cvtColor: (src: any, dst: any, code: number) => void
      GaussianBlur: (src: any, dst: any, ksize: any, sigmaX: number) => void
      Canny: (src: any, dst: any, threshold1: number, threshold2: number) => void
      findContours: (src: any, contours: any, hierarchy: any, mode: number, method: number) => void
      contourArea: (contour: any) => number
      arcLength: (contour: any, closed: boolean) => number
      approxPolyDP: (contour: any, approx: any, epsilon: number, closed: boolean) => void
      getPerspectiveTransform: (src: any, dst: any) => any
      warpPerspective: (src: any, dst: any, matrix: any, size: any) => void
      imshow: (canvas: HTMLCanvasElement, mat: any) => void
      matFromArray: (rows: number, cols: number, type: number, array: number[]) => any
      Mat: new () => any
      MatVector: new () => any
      Size: new (width: number, height: number) => any
      COLOR_RGBA2GRAY: number
      RETR_EXTERNAL: number
      CHAIN_APPROX_SIMPLE: number
      CV_32FC2: number
    }
  }
}

export {}
