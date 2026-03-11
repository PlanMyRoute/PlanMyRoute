import Svg, { Circle, Path } from 'react-native-svg';

interface LogoProps {
  width?: number;
  height?: number;
  color?: string; // Por si quieres cambiar el color de los bordes dinámicamente
}

export const Logo = ({ width = 128, height = 81, color = "black" }: LogoProps) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 128 81" fill="none">
      {/* Forma principal (Nube/Fondo) */}
      <Path
        d="M31.8976 18.7416C8.63111 18.7416 0 33.814 0 49.6879C0 68.4334 27.8104 68.0855 30.7718 56.9693C35.7025 72.2607 74.5995 70.695 72.6139 55.513C75.9148 69.6512 118.382 75.6512 126.274 55.513C132.605 39.3591 119.91 29.8943 114.106 31.3792C119.722 18.4125 97.8804 8.45008 91.2849 11.8182C87.6532 6.16302 82.1387 1.63013 62.4466 1.63013C42.7546 1.63013 33.8756 13.0378 31.8976 18.7416Z"
        fill="white" // Ojo: Si el fondo de tu app es blanco, esto no se verá bien sin un borde o sombra.
      />
      
      {/* Círculo izquierdo */}
      <Circle 
        cx="25.6277" 
        cy="64.0694" 
        r="15.9143" 
        stroke={color} 
        strokeWidth="2" 
      />
      
      {/* Círculo/Forma derecha */}
      <Path
        d="M99.4902 48.155C108.435 48.1552 115.66 55.2942 115.66 64.0691C115.66 72.8441 108.435 79.984 99.4902 79.9841C90.5452 79.9841 83.3193 72.8442 83.3193 64.0691C83.3195 55.2941 90.5453 48.155 99.4902 48.155Z"
        stroke={color}
        strokeWidth="2"
      />
      
      {/* Rayo/Camino central */}
      <Path
        d="M38.8427 31.2353L12.6959 20.8098L37.8524 1.20889L51.9413 6.82655L38.8427 31.2353Z"
        stroke={color}
        strokeWidth="2"
      />
    </Svg>
  );
};