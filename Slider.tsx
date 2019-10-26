import * as React from 'react'
import './Slider.css';
type DragTranslation = {
    x?: (name: string, coord: number, offset: number) => number;
    y?: (name: string, coord: number, offset: number) => number;
};

enum OrdinateNames {
    x = 'x',
    y = 'y'
}

function makeDraggable(svgRef: any,
    boundary: { x1: number, x2: number, y1: number, y2: number },
    updateValue: (newX: number, newY: number) => void,
    customTranslation?: DragTranslation) {
    if (svgRef.current == null) {
        return;
    }
    const svg = svgRef.current;
    let selectedElement: SVGGraphicsElement | null;
    svg.addEventListener('mousedown', startDrag);
    svg.addEventListener('mousemove', drag);
    svg.addEventListener('mouseup', endDrag);
    svg.addEventListener('mouseleave', endDrag);
    let offset: any;
    let transform: any;
    let minX: number;
    let maxX: number;
    let minY: number;
    let maxY: number;

    function move(name: string, currentOrdinate: number, offset: number) {
        const delta = currentOrdinate - offset;
        if (name == OrdinateNames.x && (delta > maxX)) {
            return maxX;
        }
        if (name == OrdinateNames.x && (delta < minY)) {
            return minY;
        }
        if (name == OrdinateNames.y && (delta > maxY)) {
            return maxY;
        }
        if (name == OrdinateNames.y && (delta < minY)) {
            return minY;
        }
        return delta;
    }

    function getMousePosition(evt) {
        var CTM = svg.getScreenCTM();
        return {
            x: (evt.clientX - CTM.e) / CTM.a,
            y: (evt.clientY - CTM.f) / CTM.d
        };
    }

    function initialiseDragging(evt) {
        if (!selectedElement) {
            throw new Error('Slider dragging initialisation - selected element cannot be null')
        }
        offset = getMousePosition(evt);

        // Make sure the first transform on the element is a translate transform
        var transforms = selectedElement.transform.baseVal;

        if (transforms.length === 0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
            // Create an transform that translates by (0, 0)
            var translate = svg.createSVGTransform();
            translate.setTranslate(0, 0);
            selectedElement.transform.baseVal.insertItemBefore(translate, 0);
        }

        // Get initial translation
        transform = transforms.getItem(0);
        offset.x -= transform.matrix.e;
        offset.y -= transform.matrix.f;

        const bbox = selectedElement.getBBox();
        minX = boundary.x1 - bbox.x;
        maxX = boundary.x2 - bbox.x - bbox.width;
        minY = boundary.y1 - bbox.y;
        maxY = boundary.y2 - bbox.y - bbox.height;
    }

    function startDrag(evt) {
        if (evt.target.classList.contains('draggable')) {
            selectedElement = evt.target;
            initialiseDragging(evt);
        } else if (evt.target.parentNode.classList.contains('draggable-group')) {
            selectedElement = evt.target.parentNode;
            initialiseDragging(evt);
        }
    }

    function drag(evt) {
        if (selectedElement) {
            evt.preventDefault();
            var coord = getMousePosition(evt);
            let translateX = move;
            if (customTranslation && customTranslation.x) {
                translateX = customTranslation.x;
            }
            let translateY = move;
            if (customTranslation && customTranslation.y) {
                translateY = customTranslation.y;
            }
            const newY = translateY(OrdinateNames.y, coord.y, offset.y);
            const newX = translateX(OrdinateNames.x, coord.x, offset.x);
            updateValue(newX, newY);
            transform.setTranslate(
                newX,
                newY);
        }
    }

    function endDrag(evt) {
        selectedElement = null;
    }

    return () => {
        svg.removeEventListener('mousedown', startDrag);
        svg.removeEventListener('mousemove', drag);
        svg.removeEventListener('mouseup', endDrag);
        svg.removeEventListener('mouseleave', endDrag);
    }
}

export enum SliderPosition {
    Horizontal = "Horizontal",
    Vertical = "Vertical"
}

export interface SliderProps {
    range: [number, number] | [number, number, number];
    step: number;
    position: SliderPosition;
    size: number;
    className: string;
}

function mapPropsToDimension(props: SliderProps) {
    const { range, size, position, className } = props;
    let center: number | null = null;
    let domainRange = range;
    if (range && range.length === 3) {
        domainRange = [range[0], range[2]];
        center = range[1];
    }

    const sliderWidth = 50;
    const handleRadius = sliderWidth / 2;

    function getScale(min: number, max: number) {
        return (value: number) => {
            return (value - min) * Math.abs(domainRange[1] - domainRange[0]) / (max - min);
        }
    }


    if (position == SliderPosition.Vertical) {
        const middleLine = { x1: (sliderWidth / 2), x2: (sliderWidth / 2), y1: 0, y2: size };
        const slideGuideLine = {
            x1: middleLine.x1, x2: middleLine.x2, y1: middleLine.y1 + handleRadius, y2: middleLine.y2 - handleRadius
        };
        return {
            area: { x: 0, y: 0, width: sliderWidth, height: size },
            middleLine,
            slideGuideLine,
            handleRadius,
            scale: getScale(slideGuideLine.y1, slideGuideLine.y2),
            center: (center !== null && center !== undefined) ? { x: (sliderWidth / 2), y: (size / 2) } : null,

        }
    }
    const middleLine = { x1: 0, x2: size, y1: (sliderWidth / 2), y2: (sliderWidth / 2) };
    const slideGuideLine = {
        x1: middleLine.x1 + handleRadius, x2: middleLine.x2 - handleRadius, y1: middleLine.y1, y2: middleLine.y2
    }
    return {
        area: { x: 0, y: 0, width: size, height: sliderWidth },
        middleLine: { x1: 0, x2: size, y1: 0, y2: (sliderWidth / 2) },
        slideGuideLine,
        handleRadius,
        scale: getScale(slideGuideLine.x1, slideGuideLine.x2),
        center: (center !== null && center !== undefined) ? { x: (size / 2), y: (sliderWidth / 2) } : null,
    }
}

const slider: React.FunctionComponent<SliderProps> = (props) => {
    const svgBoxRef = React.useRef();
    const textSvgRef = React.useRef();
    const { position, className } = props;
    const dimensions = mapPropsToDimension(props);
    const { area, handleRadius, slideGuideLine, scale } = dimensions;
    const customTranslation = getCustomTranslation(position, { x: slideGuideLine.x1, y: slideGuideLine.y1 });

    function updateValue(newX: number, newY: number) {
        const value = (position == SliderPosition.Vertical) ? newY : newX;
        textSvgRef.current.textContent = Math.round(scale(value) * 10) / 10;
    }

    React.useEffect(() => {
        return makeDraggable(svgBoxRef,
            { x1: area.x, x2: area.x + area.width, y1: area.y, y2: area.y + area.height },
            updateValue,
            customTranslation);
    });

    return (<svg width={area.width} height={area.height} ref={svgBoxRef} className={className} >
        <rect x="0" y="0" width={area.width} height={area.height} fill="#fafafa" />
        <line className="slide-guide" x1={slideGuideLine.x1} y1={slideGuideLine.y1} x2={slideGuideLine.x2} y2={slideGuideLine.y2} />
        <g className="draggable-group" transform={`translate(${slideGuideLine.x1},${slideGuideLine.y1})`}>
            <circle className="handle-border" cx="0" cy="0" r={handleRadius} />
            <circle className="handle" cx="0" cy="0" r={handleRadius * .8} />
            <text ref={textSvgRef} dx={0} dy={handleRadius * 2 * .20} textAnchor="middle" fontSize={`${handleRadius * .05}em`}>0</text>
        </g>
    </svg >);
}

export default slider;


function getCustomTranslation(position: SliderPosition, startCoordinate: { x: number, y: number }) {
    let fixOrdinate = (position == SliderPosition.Vertical) ? startCoordinate.x : startCoordinate.y;

    const dontMoveOrdinate = (name: string, currentOrdinate: number, offset: number) => {
        return fixOrdinate;
    };

    return (position == SliderPosition.Vertical) ? { x: dontMoveOrdinate } : { y: dontMoveOrdinate };
}

