/* @flow */

import React, { Component } from 'react';

const webWorkerScript = `
  self.addEventListener('message', event => {
    const url = event.data;
    fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'default'
    }).then(response => {
        return response.blob();
    }).then(_ => postMessage(url));
  })
`;


type ImageWorkerProps = {
  src: string,
  placeholder?: string | Function,
  style?: Object,
  placeholderAlt?: string
}

type ImageWorkerState = {
  isLoading: boolean,
  imgSrc: string
}


const wrappedComponent = WrappedComponent => props => {
  return <WrappedComponent {...props} />;
};

class ImageWorker extends Component<ImageWorkerProps, ImageWorkerState> {
  image: HTMLImageElement;
  worker = new Worker(URL.createObjectURL(
    new Blob([webWorkerScript], { type: 'application/javascript' })
  ))

  state = {
    isLoading: true,
    imgSrc: ''
  }
  constructor(props: ImageWorkerProps) {
    super(props);
    this.worker.onmessage = (event: Object) => {
      this.loadImage(event.data);
    };
  }

  componentDidMount() {
    this.worker.postMessage(this.props.src);
  }

  componentWillUnmount() {
    if (this.image) {
      this.image.onload = null;
      this.image.onerror = null;
    }
    this.worker.terminate();
  }

  renderPlaceholder() {
    const { placeholder, style, placeholderAlt } = this.props;
    if (typeof placeholder === 'function') {
      const PlaceholderComponent = wrappedComponent(placeholder);
      return <PlaceholderComponent />;
    } else if (typeof placeholder === 'string') {
      return <img src={placeholder} style={{ ...style }} alt={placeholderAlt} />;
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
    const { style, src, placeholderAlt, placeholder, ...props } = this.props; // eslint-disable-line no-unused-vars
    const { isLoading, imgSrc } = this.state;
    return isLoading ? this.renderPlaceholder() :
      <img src={imgSrc}
        style={{ ...style }} {...props} />;
  }
}

export default ImageWorker;
