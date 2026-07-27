// Keep Safari/main-thread operation behaviorally identical to the worker path.
export { scanGrayImage as scanGrayImageOnMainThread } from './imagePipeline'
