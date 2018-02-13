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
    }).then(_ => postMessage(url)).catch(console.error);
  })
`;

type ImageWorkerProps = {
  placeholder?: string | Function,
  src: string
};

type ImageWorkerState = {
  imgSrc: string,
  isLoading: boolean
};

class ImageWorker extends Component<ImageWorkerProps, ImageWorkerState> {
  image: HTMLImageElement;

  worker = new Worker(
    URL.createObjectURL(
      new Blob([webWorkerScript], { type: 'application/javascript' })
    )
  );

  state = {
    isLoading: true,
    imgSrc: ''
  };

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
    const { placeholder, src, ...attributes } = this.props; // eslint-disable-line no-unused-vars

    if (typeof placeholder === 'function') {
      const PlaceholderComponent = placeholder;

      return <PlaceholderComponent />;
    } else if (typeof placeholder === 'string') {
      return <img {...attributes} src={placeholder} />;
    }

    return null;
  }

  loadImage = (url: string) => {
    const image = new Image();
    this.image = image;

    image.src = url;
    image.decode !== undefined
      ? image
        .decode()
        .then(this.onLoad)
        .catch(this.onLoad)
      : (image.onload = this.onLoad);
  };

  onLoad = () => {
    this.setState({
      imgSrc: this.image.src,
      isLoading: false
    });
  };

  render() {
    const { placeholder, src, ...attributes } = this.props; // eslint-disable-line no-unused-vars

    return this.state.isLoading ? (
      this.renderPlaceholder()
    ) : (
      <img {...attributes} src={this.state.imgSrc} />
    );
  }
}

export default ImageWorker;
