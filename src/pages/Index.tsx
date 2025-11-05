import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import * as THREE from 'three';

const SKIN_WIDTH = 64;
const SKIN_HEIGHT = 64;

const DEFAULT_PALETTE = [
  '#8B4513', '#A0522D', '#D2691E', '#DEB887', '#F5DEB3',
  '#6B8E23', '#556B2F', '#9ACD32', '#ADFF2F', '#7FFF00',
  '#4A4A4A', '#696969', '#808080', '#A9A9A9', '#D3D3D3',
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
];

interface MinecraftPlayerProps {
  skinTexture: THREE.Texture;
  onPartClick: (event: ThreeEvent<MouseEvent>, partName: string) => void;
}

const MinecraftPlayer = ({ skinTexture, onPartClick }: MinecraftPlayerProps) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh position={[0, 1.5, 0]} onClick={(e) => onPartClick(e, 'head')}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial map={skinTexture} />
      </mesh>

      <mesh position={[0, 0.5, 0]} onClick={(e) => onPartClick(e, 'body')}>
        <boxGeometry args={[0.8, 1.2, 0.4]} />
        <meshStandardMaterial map={skinTexture} />
      </mesh>

      <mesh position={[-0.5, 0.5, 0]} onClick={(e) => onPartClick(e, 'leftArm')}>
        <boxGeometry args={[0.4, 1.2, 0.4]} />
        <meshStandardMaterial map={skinTexture} />
      </mesh>

      <mesh position={[0.5, 0.5, 0]} onClick={(e) => onPartClick(e, 'rightArm')}>
        <boxGeometry args={[0.4, 1.2, 0.4]} />
        <meshStandardMaterial map={skinTexture} />
      </mesh>

      <mesh position={[-0.2, -0.6, 0]} onClick={(e) => onPartClick(e, 'leftLeg')}>
        <boxGeometry args={[0.4, 1.2, 0.4]} />
        <meshStandardMaterial map={skinTexture} />
      </mesh>

      <mesh position={[0.2, -0.6, 0]} onClick={(e) => onPartClick(e, 'rightLeg')}>
        <boxGeometry args={[0.4, 1.2, 0.4]} />
        <meshStandardMaterial map={skinTexture} />
      </mesh>

      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
    </group>
  );
};

const Index = () => {
  const [currentColor, setCurrentColor] = useState('#8B4513');
  const [tool, setTool] = useState<'brush' | 'eraser' | 'fill' | 'eyedropper'>('brush');
  const [activeTab, setActiveTab] = useState('editor');
  const [skinTexture, setSkinTexture] = useState<THREE.Texture | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializeSkin();
  }, []);

  const initializeSkin = () => {
    const canvas = document.createElement('canvas');
    canvas.width = SKIN_WIDTH;
    canvas.height = SKIN_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#C6C6C6';
    ctx.fillRect(0, 0, SKIN_WIDTH, SKIN_HEIGHT);

    ctx.fillStyle = '#8B7355';
    ctx.fillRect(8, 8, 8, 8);
    ctx.fillRect(16, 8, 8, 8);
    ctx.fillRect(8, 16, 16, 8);
    
    ctx.fillStyle = '#4A90E2';
    ctx.fillRect(20, 20, 8, 12);
    ctx.fillRect(28, 20, 8, 12);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;

    setSkinTexture(texture);
    
    if (canvasRef.current) {
      const displayCtx = canvasRef.current.getContext('2d');
      if (displayCtx) {
        displayCtx.drawImage(canvas, 0, 0);
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = SKIN_WIDTH / rect.width;
    const scaleY = SKIN_HEIGHT / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x < 0 || x >= SKIN_WIDTH || y < 0 || y >= SKIN_HEIGHT) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'brush') {
      ctx.fillStyle = currentColor;
      ctx.fillRect(x, y, 1, 1);
    } else if (tool === 'eraser') {
      ctx.clearRect(x, y, 1, 1);
    } else if (tool === 'eyedropper') {
      const imageData = ctx.getImageData(x, y, 1, 1);
      const [r, g, b] = imageData.data;
      setCurrentColor(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
      setTool('brush');
      toast.success('Цвет выбран!');
    } else if (tool === 'fill') {
      floodFill(ctx, x, y, currentColor);
    }

    updateTexture(canvas);
  };

  const floodFill = (ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string) => {
    const imageData = ctx.getImageData(0, 0, SKIN_WIDTH, SKIN_HEIGHT);
    const targetColor = getPixelColor(imageData, startX, startY);
    const fillColorRgb = hexToRgb(fillColor);
    
    if (colorsMatch(targetColor, fillColorRgb)) return;

    const stack = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      if (x < 0 || x >= SKIN_WIDTH || y < 0 || y >= SKIN_HEIGHT) continue;
      
      const currentColor = getPixelColor(imageData, x, y);
      if (!colorsMatch(currentColor, targetColor)) continue;

      visited.add(key);
      setPixelColor(imageData, x, y, fillColorRgb);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const getPixelColor = (imageData: ImageData, x: number, y: number) => {
    const index = (y * SKIN_WIDTH + x) * 4;
    return [
      imageData.data[index],
      imageData.data[index + 1],
      imageData.data[index + 2],
      imageData.data[index + 3]
    ];
  };

  const setPixelColor = (imageData: ImageData, x: number, y: number, color: number[]) => {
    const index = (y * SKIN_WIDTH + x) * 4;
    imageData.data[index] = color[0];
    imageData.data[index + 1] = color[1];
    imageData.data[index + 2] = color[2];
    imageData.data[index + 3] = 255;
  };

  const colorsMatch = (c1: number[], c2: number[]) => {
    return c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2];
  };

  const hexToRgb = (hex: string): number[] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  const updateTexture = (canvas: HTMLCanvasElement) => {
    if (!skinTexture) return;
    
    const newTexture = new THREE.CanvasTexture(canvas);
    newTexture.magFilter = THREE.NearestFilter;
    newTexture.minFilter = THREE.NearestFilter;
    newTexture.needsUpdate = true;
    setSkinTexture(newTexture);
  };

  const handlePartClick = (event: ThreeEvent<MouseEvent>, partName: string) => {
    event.stopPropagation();
    toast.info(`Клик на: ${partName}`);
  };

  const handleLoadSkin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, SKIN_WIDTH, SKIN_HEIGHT);
        ctx.drawImage(img, 0, 0, SKIN_WIDTH, SKIN_HEIGHT);
        
        updateTexture(canvas);
        toast.success('Скин загружен!');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSkin = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'minecraft_skin.png';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Скин сохранён!');
    });
  };

  const handleClearCanvas = () => {
    initializeSkin();
    toast.success('Холст очищен!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 pt-8">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
            SkinLoder
          </h1>
          <p className="text-lg text-muted-foreground">Редактор скинов Minecraft</p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="editor">Редактор</TabsTrigger>
            <TabsTrigger value="guide">Инструкция</TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6 shadow-xl backdrop-blur-sm bg-white/80">
                <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                  3D Модель
                </h2>
                <div className="bg-gradient-to-b from-sky-400 to-green-400 rounded-xl overflow-hidden" style={{ height: '500px' }}>
                  {skinTexture && (
                    <Canvas camera={{ position: [0, 1.5, 4], fov: 50 }}>
                      <MinecraftPlayer skinTexture={skinTexture} onPartClick={handlePartClick} />
                      <OrbitControls enableZoom={true} enablePan={false} />
                    </Canvas>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Вращайте модель мышкой • Кликайте на части тела
                </p>
              </Card>

              <Card className="p-6 shadow-xl backdrop-blur-sm bg-white/80">
                <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Текстура скина
                </h2>
                
                <div className="bg-gray-100 p-4 rounded-xl mb-6 border-2 border-gray-200">
                  <canvas
                    ref={canvasRef}
                    width={SKIN_WIDTH}
                    height={SKIN_HEIGHT}
                    onClick={handleCanvasClick}
                    className="w-full h-auto cursor-crosshair border-2 border-gray-300 rounded"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-semibold mb-3 text-gray-700">Инструменты</p>
                    <div className="grid grid-cols-4 gap-2">
                      <Button
                        variant={tool === 'brush' ? 'default' : 'outline'}
                        size="lg"
                        onClick={() => setTool('brush')}
                        className="transition-all hover:scale-105"
                      >
                        <Icon name="Pencil" size={20} />
                      </Button>
                      <Button
                        variant={tool === 'eraser' ? 'default' : 'outline'}
                        size="lg"
                        onClick={() => setTool('eraser')}
                        className="transition-all hover:scale-105"
                      >
                        <Icon name="Eraser" size={20} />
                      </Button>
                      <Button
                        variant={tool === 'fill' ? 'default' : 'outline'}
                        size="lg"
                        onClick={() => setTool('fill')}
                        className="transition-all hover:scale-105"
                      >
                        <Icon name="PaintBucket" size={20} />
                      </Button>
                      <Button
                        variant={tool === 'eyedropper' ? 'default' : 'outline'}
                        size="lg"
                        onClick={() => setTool('eyedropper')}
                        className="transition-all hover:scale-105"
                      >
                        <Icon name="Pipette" size={20} />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-3 text-gray-700">Палитра цветов</p>
                    <div className="grid grid-cols-10 gap-2 mb-3">
                      {DEFAULT_PALETTE.map((color) => (
                        <button
                          key={color}
                          onClick={() => setCurrentColor(color)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                            currentColor === color ? 'ring-4 ring-blue-500 scale-110' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => setCurrentColor(e.target.value)}
                        className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs text-gray-500">Текущий цвет</p>
                        <p className="font-mono text-sm font-bold">{currentColor}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png"
                      onChange={handleLoadSkin}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="secondary"
                      className="flex-1"
                    >
                      <Icon name="Upload" size={16} className="mr-2" />
                      Загрузить
                    </Button>
                    <Button
                      onClick={handleSaveSkin}
                      className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                    >
                      <Icon name="Download" size={16} className="mr-2" />
                      Сохранить
                    </Button>
                    <Button
                      onClick={handleClearCanvas}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Icon name="Trash2" size={16} className="mr-2" />
                      Очистить
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="guide">
            <Card className="p-8 shadow-xl backdrop-blur-sm bg-white/80 max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-green-500 to-purple-500 bg-clip-text text-transparent">
                Как пользоваться
              </h2>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border-l-4 border-green-500">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-3">
                    <Icon name="MousePointer" size={24} className="text-green-500" />
                    Вращение модели
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Зажмите левую кнопку мыши на 3D модели и двигайте мышкой, чтобы вращать персонажа. 
                    Используйте колесико для приближения и отдаления.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border-l-4 border-blue-500">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-3">
                    <Icon name="Pencil" size={24} className="text-blue-500" />
                    Рисование текстуры
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Выберите инструмент и цвет. Кликайте по текстуре скина справа, чтобы рисовать пиксель за пикселем. 
                    Изменения мгновенно отобразятся на 3D модели.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border-l-4 border-purple-500">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-3">
                    <Icon name="Upload" size={24} className="text-purple-500" />
                    Загрузка и сохранение
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Загрузите существующий скин (PNG 64x64) или создайте новый. 
                    Нажмите "Сохранить", чтобы скачать готовый файл для Minecraft.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border-l-4 border-yellow-500">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-3">
                    <Icon name="Lightbulb" size={24} className="text-yellow-600" />
                    Полезные советы
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      <span>Используйте инструмент заливки для быстрого закрашивания областей</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      <span>Пипетка помогает взять цвет из любой точки текстуры</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      <span>Minecraft поддерживает формат 64x64 для классических скинов</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
