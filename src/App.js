/* global window,document */
import React, {Component} from 'react';
import {render} from 'react-dom';
import MapGL from 'react-map-gl';
import DeckGLOverlay from './deckgl-overlay.js';
import Header from './header.js';
import Navbar from './Navbar.js';
import InfoPanel from './infoPanel.js';

import { DataContainer } from './lib/dataContainer';
import Scrubber from './components/scrubber';
import 'mapbox-gl/dist/mapbox-gl.css';

import {csv as requestCsv, json as requestJson} from 'd3-request';

// Set your mapbox token here
const MAPBOX_TOKEN = 'pk.eyJ1IjoidWJlcmRhdGEiLCJhIjoidGllX1gxUSJ9.gElUooDF7u51guCQREmAhg'; // eslint-disable-line

const PUBLIC_URL = process.env.PUBLIC_URL || '';

// Source data CSV
const DATA_URLS = {
  'biz': PUBLIC_URL + '/data/business.csv',
}

let labelLookup = {}
let labels = Array(2017 - 1968).fill().map((_, i) => i + 1968);
labels.map((x, i) => labelLookup[x] = i)

export default class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      viewport: {
        ...DeckGLOverlay.defaultViewport,
        width: 500,
        height: 500,
      },
      db: null,
      data: null,
      clickedDatum: null,
      view: 'biz',
      timer: null,
      currentYear: null,
    };

    this.tick = this.tick.bind(this)
    this._onScrubberClick = this._onScrubberClick.bind(this)
  }

  componentDidMount() {
    window.addEventListener('resize', this._resize.bind(this));
    this._resize();
    requestCsv(DATA_URLS[this.state.view], (error, response) => {
      if (!error) {
        let dc = new DataContainer(response, 'biz', `
        CREATE TABLE biz (
          lat            FLOAT,
          lng            FLOAT,
          start_date     VARCHAR(10),
          end_date       VARCHAR(10),
          business_name  VARCHAR(100),
          business_type  VARCHAR(100)
        )`, `start_date`, `end_date`)
        this.setState({
          db: dc,
          data: dc.query('SELECT * FROM biz'),
          timer: setInterval(this.tick, 100),
        })
      }
    });
  };

  tick() {
    const res = this.state.db.nextResultSet();
    if (res) {
      this.setState({
        data: res,
        currentYear: this.state.db.currTs,
      });
    }
  }

  _resize() {
    this._onViewportChange({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }

  _onViewportChange(viewport) {
    this.setState({
      viewport: {...this.state.viewport, ...viewport}
    });
  }

  _remapProperties(properties) {

  }

  _onHover(info) {
    // Hovered over a county
    // try {
    //   let properties = info.object;
    //   // properties = this._remapProperties(properties)
    //   this.setState({clickedDatum: properties})
    // } catch(err) {
    //   this.setState({
    //     clickedDatum: null
    //   })
    // }
  }

  // _onNavClick(text) {
  //   let view = LOOKUP[text];
  //   let requestFunc = DATA_URLS[view].endsWith('.json') ? requestJson : requestCsv;
  //     requestFunc(DATA_URLS[view], (error, response) => {
  //       if (!error) {
  //         this._resize();
  //         this.setState({
  //           db: response,
  //           view,
  //         });
  //       }
  //   });
  // }
  _onScrubberClick(idx) {
    clearInterval(this.state.timer)
    const year = "" + labels[idx];
    const res = this.state.db.getResultSetAtTime(year)
    this.setState({
      currentYear: year,
      data: res,
      timer: null,
    })
  }

  _onClick(info) {
    try {
      let properties = info.object;
      // properties = this._remapProperties(properties)
      this.setState({
        clickedDatum: properties,
      })
    } catch(err) {
      this.setState({
        clickedDatum: null,
      })
    }
  }

  _onClickStop(e){
    e.preventDefault();
  }

  render() {
    const {
      viewport,
      data,
      view,
      clickedDatum,
      currentYear,
    } = this.state;
    // TODO add layer selection bar
    // TODO add legend
    let glThing;
    if (!data) {
      glThing = null
    } else {
      glThing = (<MapGL

        {...viewport}
        onViewportChange={this._onViewportChange.bind(this)}
        mapboxApiAccessToken={MAPBOX_TOKEN}>
        <DeckGLOverlay viewport={viewport}
          data={data}
          onHover={this._onHover.bind(this)}
          onClick={this._onClick.bind(this)}
          extruded={true}
          view={'biz'}
          radius={30}
          />
      </MapGL>
      )
    }
    let year = (currentYear || '').substring(0,4)
    let scrubberIdx = labelLookup[year]
    return (
      <div>
        <div style={{'grid': '2 2'}} >
          <Header
            title={'A Half-Century of San Franciscan Growth'}
            subtitle={''}
          />
          <Scrubber
            marks={labels}
            currentIdx={scrubberIdx}
            handleClick={this._onScrubberClick}
          />
        </div>
      {glThing}
      <div style={{background: 'black', 'zLevel': 100}}> Hold shift to rotate </div>
      <InfoPanel
        title={'Business Detail'}
        data={clickedDatum}
        description={''}
      />
      </div>

    );
  }
}
