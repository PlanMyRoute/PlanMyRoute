import NodeGeocoder from 'node-geocoder';

const options: NodeGeocoder.Options = {
    provider: 'openstreetmap',
};

const geocoder = NodeGeocoder(options);

export default geocoder;