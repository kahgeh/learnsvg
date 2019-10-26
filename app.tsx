import * as React from 'react'
import { render } from 'react-dom'
import './app.css';
import Slider, { SliderPosition } from './Slider';

const App: React.FunctionComponent = () => {
    return (<>
        <div className='drawer-container'>
            <div className="drawer-item">Slider</div>

        </div>
        <div className="content-container">
            <div className="content-title">Slider</div>
            <div className="main-content" >
                <Slider className="content" position={SliderPosition.Vertical} range={[0.1, 0, 10]} size={200} />
            </div>
        </div>
        <div className="chart-footer">
        </div>
    </>);
}

render(<App />, document.getElementById('root'))