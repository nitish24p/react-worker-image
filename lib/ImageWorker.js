/* @flow */

import React, { Component } from 'react';

const webWorkerScript = `
  const handleResponse = response => response.blob();
  self.addEventListener('message', event => {
    const url = event.data;
    fetch(url, { mode: 'no-cors' }).then(handleResponse).then(() => postMessage(url));
  })
`;


type ImageWorkerProps = {
  src: string,
  placeholder?: string | Function,
  style?: Object,
  imageClass?: string,
  containerClass?: string,
}

type ImageWorkerState = {
  isLoading: boolean,
  imgSrc: string
}


const wrappedComponent = WrappedComponent => props => {
  return <WrappedComponent {...props} />;
};

/** Have we initiated the worker pool already? */
let workerPoolCreated = false;
const workerPool = [];

function createWorkerPool() {
  const blobURL = URL.createObjectURL(
    new Blob([webWorkerScript], { type: 'application/javascript' })
  );
  for (let i = 0; i < window.navigator.hardwareConcurrency || 4; ++i) {
    workerPool.push({
      worker: new Worker(blobURL),
      inUse: false,
      i
    });
  }
}

/** Returns the next available worker. */
function getNextWorker() {
  for (let i = 0; i < workerPool.length; ++i) {
    const worker = workerPool[i];
    if (!worker.inUse) {
      worker.inUse = true;
      return worker;
    }
  }
  // no free found, so we just return the first one
  return workerPool[0];
}

/** Marks worker `index` as available. */
function setFree(index: number) {
  workerPool[index].inUse = false;
}


class ImageWorker extends Component<ImageWorkerProps, ImageWorkerState> {
  image: HTMLImageElement;

  state = {
    isLoading: true,
    imgSrc: ''
  }
  constructor(props: ImageWorkerProps) {
    super(props);
    this.image = null;

    if (!workerPoolCreated) {
      workerPoolCreated = true;
      createWorkerPool();
    }

    const workerObj = getNextWorker();
    workerObj.worker.onmessage = (event: Object) => {
      this.loadImage(event.data);
      setFree(workerObj.i);
    };
    workerObj.worker.postMessage(this.props.src);
  }

  componentWillUnmount() {
    if (this.image !== null) {
      this.image.onload = null;
      this.image.onerror = null;
    }
  }

  renderPlaceholder() {
    const { placeholder, style } = this.props;
    if (typeof placeholder === 'function') {
      const PlaceholderComponent = wrappedComponent(placeholder);
      return <PlaceholderComponent />;
    } else if (typeof placeholder === 'string') {
      return <img src={placeholder} style={{ ...style }} alt='placeholder' />;
    } else {
      return null;
    }
  }

  loadImage = (url: string) => {
    const image = new Image();
    this.image = image;
    image.onload = this.onLoad;
    image.src = url;
  }

  onLoad = () => {
    this.setState({
      imgSrc: this.image.src,
      isLoading: false
    });
  }

  render() {
    const { style, imageClass, containerClass } = this.props;
    return (
      <div className={containerClass}>
        {
          this.state.isLoading ? this.renderPlaceholder() :
            <img src={this.state.imgSrc}
              style={{ ...style }} className={imageClass} alt='worker' />
        }
      </div>
    );
  }
}

export default ImageWorker;
