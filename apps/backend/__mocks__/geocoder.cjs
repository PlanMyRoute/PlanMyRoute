const geocoder = {
  geocode: jest.fn(async (address) => [
    { latitude: 40.4168, longitude: -3.7038, formattedAddress: address }
  ]),
  reverse: jest.fn(async () => []),
};

module.exports = geocoder;
module.exports.default = geocoder;
