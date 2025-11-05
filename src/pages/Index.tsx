import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

const SKIN_SIZE = 64;
const CANVAS_SCALE = 8;

const DEFAULT_PALETTE = [
  '#8B4513', '#A0522D', '#D2691E', '#DEB887', '#F5DEB3',
  '#6B8E23', '#556B2F', '#9ACD32', '#ADFF2F', '#7FFF00',
  '#4A4A4A', '#696969', '#808080', '#A9A9A9', '#D3D3D3',
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
];

const Index = () => {
  const [currentColor, setCurrentColor] = useState('#8B4513');
  const [tool, setTool] = useState<'brush' | 'eraser' | 'fill' | 'eyedropper'>('brush');
  const [rotation, setRotation] = useState(0);
  const [activeTab, setActiveTab] = useState('editor');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const skinDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    initializeCanvas();
    const interval = setInterval(() => {
      setRotation(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    drawPreview();
  }, [rotation]);

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#C6C6C6';
    ctx.fillRect(0, 0, SKIN_SIZE, SKIN_SIZE);

    skinDataRef.current = ctx.getImageData(0, 0, SKIN_SIZE, SKIN_SIZE);
    redrawCanvas();
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !skinDataRef.current) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.putImageData(skinDataRef.current, 0, 0);
  };

  const drawPreview = () => {
    const canvas = previewCanvasRef.current;
    const skinCanvas = canvasRef.current;
    if (!canvas || !skinCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    
    const scale = 4;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(skinCanvas, -32 * scale / 2, -32 * scale / 2, 32 * scale, 32 * scale);
    
    ctx.restore();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !skinDataRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CANVAS_SCALE);
    const y = Math.floor((e.clientY - rect.top) / CANVAS_SCALE);

    if (x < 0 || x >= SKIN_SIZE || y < 0 || y >= SKIN_SIZE) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'brush') {
      drawPixel(ctx, x, y, currentColor);
    } else if (tool === 'eraser') {
      drawPixel(ctx, x, y, 'rgba(0,0,0,0)');
    } else if (tool === 'eyedropper') {
      const imageData = ctx.getImageData(x, y, 1, 1);
      const [r, g, b] = imageData.data;
      setCurrentColor(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
      setTool('brush');
      toast.success('Цвет выбран!');
    } else if (tool === 'fill') {
      floodFill(ctx, x, y, currentColor);
    }

    skinDataRef.current = ctx.getImageData(0, 0, SKIN_SIZE, SKIN_SIZE);
    drawPreview();
  };

  const drawPixel = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };

  const floodFill = (ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string) => {
    const imageData = ctx.getImageData(0, 0, SKIN_SIZE, SKIN_SIZE);
    const targetColor = getPixelColor(imageData, startX, startY);
    const fillColorRgb = hexToRgb(fillColor);
    
    if (colorsMatch(targetColor, fillColorRgb)) return;

    const stack = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      if (x < 0 || x >= SKIN_SIZE || y < 0 || y >= SKIN_SIZE) continue;
      
      const currentColor = getPixelColor(imageData, x, y);
      if (!colorsMatch(currentColor, targetColor)) continue;

      visited.add(key);
      setPixelColor(imageData, x, y, fillColorRgb);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const getPixelColor = (imageData: ImageData, x: number, y: number) => {
    const index = (y * SKIN_SIZE + x) * 4;
    return [
      imageData.data[index],
      imageData.data[index + 1],
      imageData.data[index + 2],
      imageData.data[index + 3]
    ];
  };

  const setPixelColor = (imageData: ImageData, x: number, y: number, color: number[]) => {
    const index = (y * SKIN_SIZE + x) * 4;
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

        ctx.clearRect(0, 0, SKIN_SIZE, SKIN_SIZE);
        ctx.drawImage(img, 0, 0, SKIN_SIZE, SKIN_SIZE);
        skinDataRef.current = ctx.getImageData(0, 0, SKIN_SIZE, SKIN_SIZE);
        
        toast.success('Скин загружен!');
        drawPreview();
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
    initializeCanvas();
    toast.success('Холст очищен!');
  };

  return (
    <div className="min-h-screen bg-background p-4" style={{ fontFamily: "'Press Start 2P', cursive" }}>
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 pt-8">
          <h1 className="text-4xl md:text-5xl text-primary mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)]">
            SkinLoder
          </h1>
          <p className="text-sm text-muted-foreground">Редактор скинов Minecraft</p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 h-12 bg-card border-4 border-border">
            <TabsTrigger value="editor" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Редактор
            </TabsTrigger>
            <TabsTrigger value="guide" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Инструкция
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-4 border-border shadow-[8px_8px_0_rgba(0,0,0,0.2)]">
                <h2 className="text-lg mb-4 text-primary">3D Превью</h2>
                <div className="bg-gradient-to-b from-sky-400 to-green-400 p-8 rounded-none border-4 border-border">
                  <canvas
                    ref={previewCanvasRef}
                    width={256}
                    height={256}
                    className="w-full h-auto mx-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              </Card>

              <Card className="p-6 border-4 border-border shadow-[8px_8px_0_rgba(0,0,0,0.2)]">
                <h2 className="text-lg mb-4 text-primary">Холст</h2>
                <div className="bg-muted p-4 border-4 border-border mb-4">
                  <canvas
                    ref={canvasRef}
                    width={SKIN_SIZE}
                    height={SKIN_SIZE}
                    onClick={handleCanvasClick}
                    className="w-full h-auto cursor-crosshair border-2 border-border"
                    style={{
                      width: SKIN_SIZE * CANVAS_SCALE,
                      height: SKIN_SIZE * CANVAS_SCALE,
                      imageRendering: 'pixelated'
                    }}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs mb-2 text-muted-foreground">Инструменты:</p>
                    <div className="grid grid-cols-4 gap-2">
                      <Button
                        variant={tool === 'brush' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTool('brush')}
                        className="border-2 border-border shadow-[4px_4px_0_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      >
                        <Icon name="Pencil" size={16} />
                      </Button>
                      <Button
                        variant={tool === 'eraser' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTool('eraser')}
                        className="border-2 border-border shadow-[4px_4px_0_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      >
                        <Icon name="Eraser" size={16} />
                      </Button>
                      <Button
                        variant={tool === 'fill' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTool('fill')}
                        className="border-2 border-border shadow-[4px_4px_0_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      >
                        <Icon name="PaintBucket" size={16} />
                      </Button>
                      <Button
                        variant={tool === 'eyedropper' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTool('eyedropper')}
                        className="border-2 border-border shadow-[4px_4px_0_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      >
                        <Icon name="Pipette" size={16} />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs mb-2 text-muted-foreground">Палитра:</p>
                    <div className="grid grid-cols-10 gap-1">
                      {DEFAULT_PALETTE.map((color) => (
                        <button
                          key={color}
                          onClick={() => setCurrentColor(color)}
                          className={`w-8 h-8 border-2 border-border shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:scale-110 transition-transform ${
                            currentColor === color ? 'ring-4 ring-primary' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => setCurrentColor(e.target.value)}
                        className="w-12 h-12 border-2 border-border cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground">{currentColor}</span>
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
                      size="sm"
                      className="border-2 border-border shadow-[4px_4px_0_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-xs"
                    >
                      <Icon name="Upload" size={14} className="mr-1" />
                      Загрузить
                    </Button>
                    <Button
                      onClick={handleSaveSkin}
                      variant="default"
                      size="sm"
                      className="border-2 border-border shadow-[4px_4px_0_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-xs"
                    >
                      <Icon name="Download" size={14} className="mr-1" />
                      Сохранить
                    </Button>
                    <Button
                      onClick={handleClearCanvas}
                      variant="destructive"
                      size="sm"
                      className="border-2 border-border shadow-[4px_4px_0_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-xs"
                    >
                      <Icon name="Trash2" size={14} className="mr-1" />
                      Очистить
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="guide">
            <Card className="p-8 border-4 border-border shadow-[8px_8px_0_rgba(0,0,0,0.2)] max-w-3xl mx-auto">
              <h2 className="text-2xl mb-6 text-primary">Как пользоваться</h2>
              
              <div className="space-y-6 text-sm leading-relaxed">
                <div className="bg-card p-4 border-2 border-border">
                  <h3 className="text-lg mb-3 text-secondary flex items-center gap-2">
                    <Icon name="Pencil" size={16} />
                    Рисование
                  </h3>
                  <p className="text-muted-foreground">
                    Выберите кисть и цвет из палитры. Кликайте по холсту, чтобы рисовать пиксель за пикселем. 
                    Используйте заливку для быстрого закрашивания областей.
                  </p>
                </div>

                <div className="bg-card p-4 border-2 border-border">
                  <h3 className="text-lg mb-3 text-secondary flex items-center gap-2">
                    <Icon name="Upload" size={16} />
                    Загрузка скина
                  </h3>
                  <p className="text-muted-foreground">
                    Нажмите "Загрузить" и выберите PNG файл размером 64x64 пикселя. 
                    Скин автоматически отобразится в редакторе.
                  </p>
                </div>

                <div className="bg-card p-4 border-2 border-border">
                  <h3 className="text-lg mb-3 text-secondary flex items-center gap-2">
                    <Icon name="Download" size={16} />
                    Сохранение
                  </h3>
                  <p className="text-muted-foreground">
                    Когда скин готов, нажмите "Сохранить". Файл minecraft_skin.png сохранится на ваш компьютер. 
                    Загрузите его в Minecraft через настройки профиля.
                  </p>
                </div>

                <div className="bg-card p-4 border-2 border-border">
                  <h3 className="text-lg mb-3 text-secondary flex items-center gap-2">
                    <Icon name="Eye" size={16} />
                    3D Превью
                  </h3>
                  <p className="text-muted-foreground">
                    Ваш скин отображается на вращающейся модели. Так вы видите, как он будет выглядеть в игре в реальном времени.
                  </p>
                </div>

                <div className="bg-secondary/10 p-4 border-2 border-secondary mt-6">
                  <p className="text-xs text-muted-foreground">
                    💡 Совет: Minecraft использует формат 64x64 для классических скинов. 
                    Убедитесь, что ваш файл соответствует этому размеру!
                  </p>
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
