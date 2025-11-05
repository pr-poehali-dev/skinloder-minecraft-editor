import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

const SKIN_WIDTH = 64;
const SKIN_HEIGHT = 64;

const DEFAULT_PALETTE = [
  '#8B4513', '#A0522D', '#D2691E', '#DEB887', '#F5DEB3',
  '#6B8E23', '#556B2F', '#9ACD32', '#ADFF2F', '#7FFF00',
  '#4A4A4A', '#696969', '#808080', '#A9A9A9', '#D3D3D3',
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
];

type ViewAngle = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
type ModelType = 'steve' | 'alex';
type BodyPart = 'head' | 'body' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

const Index = () => {
  const [currentColor, setCurrentColor] = useState('#8B4513');
  const [tool, setTool] = useState<'brush' | 'eraser' | 'fill' | 'eyedropper'>('brush');
  const [brushSize, setBrushSize] = useState(1);
  const [activeTab, setActiveTab] = useState('editor');
  const [viewAngle, setViewAngle] = useState<ViewAngle>('front');
  const [modelType, setModelType] = useState<ModelType>('steve');
  const [showOverlay, setShowOverlay] = useState(true);
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [visibleParts, setVisibleParts] = useState({
    head: true,
    body: true,
    leftArm: true,
    rightArm: true,
    leftLeg: true,
    rightLeg: true
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializeSkin();
  }, []);

  useEffect(() => {
    drawPreview();
  }, [viewAngle, showOverlay, visibleParts, modelType]);

  const initializeSkin = () => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas || !overlayCanvas) return;
    
    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    if (!ctx || !overlayCtx) return;

    ctx.imageSmoothingEnabled = false;
    overlayCtx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#C6C6C6';
    ctx.fillRect(0, 0, SKIN_WIDTH, SKIN_HEIGHT);

    ctx.fillStyle = '#8B7355';
    ctx.fillRect(8, 8, 8, 8);
    ctx.fillRect(16, 8, 8, 8);
    ctx.fillRect(8, 16, 16, 8);
    
    ctx.fillStyle = '#4A90E2';
    ctx.fillRect(20, 20, 8, 12);
    ctx.fillRect(28, 20, 8, 12);

    saveToHistory();
    drawPreview();
  };

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, SKIN_WIDTH, SKIN_HEIGHT);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    
    if (newHistory.length > 20) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setHistoryIndex(historyIndex - 1);
    ctx.putImageData(history[historyIndex - 1], 0, 0);
    drawPreview();
    toast.success('Отменено');
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setHistoryIndex(historyIndex + 1);
    ctx.putImageData(history[historyIndex + 1], 0, 0);
    drawPreview();
    toast.success('Повторено');
  };

  const drawPreview = () => {
    const previewCanvas = previewCanvasRef.current;
    const skinCanvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!previewCanvas || !skinCanvas) return;

    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    const width = previewCanvas.width;
    const height = previewCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);

    const scale = 5;
    const headSize = 8 * scale;
    const bodyWidth = 8 * scale;
    const bodyHeight = 12 * scale;
    const armWidth = (modelType === 'alex' ? 3 : 4) * scale;
    const armHeight = 12 * scale;
    const legWidth = 4 * scale;
    const legHeight = 12 * scale;

    ctx.save();
    ctx.translate(centerX, centerY);

    const drawCubeFace = (sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, part: BodyPart) => {
      if (!visibleParts[part]) return;
      
      ctx.drawImage(skinCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
      
      if (showOverlay && overlayCanvas) {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(overlayCanvas, sx + 32, sy, sw, sh, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      }

      if (selectedPart === part) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(dx, dy, dw, dh);
      }
    };

    let rotationAngle = 0;
    switch (viewAngle) {
      case 'back': rotationAngle = 180; break;
      case 'left': rotationAngle = 90; break;
      case 'right': rotationAngle = -90; break;
      case 'top': rotationAngle = 0; break;
      case 'bottom': rotationAngle = 0; break;
    }

    ctx.rotate((rotationAngle * Math.PI) / 180);

    const headY = -bodyHeight - headSize / 2 - 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    drawCubeFace(8, 8, 8, 8, -headSize / 2, headY, headSize, headSize, 'head');

    const bodyY = -bodyHeight / 2;
    drawCubeFace(20, 20, 8, 12, -bodyWidth / 2, bodyY, bodyWidth, bodyHeight, 'body');

    const armOffset = bodyWidth / 2 + armWidth / 2 + 4;
    const leftArmX = -armOffset;
    const rightArmX = armOffset - armWidth;
    drawCubeFace(44, 20, modelType === 'alex' ? 3 : 4, 12, leftArmX, bodyY, armWidth, armHeight, 'leftArm');
    drawCubeFace(44, 20, modelType === 'alex' ? 3 : 4, 12, rightArmX, bodyY, armWidth, armHeight, 'rightArm');

    const legY = bodyY + bodyHeight;
    const leftLegX = -bodyWidth / 2;
    const rightLegX = -legWidth;
    drawCubeFace(4, 20, 4, 12, leftLegX, legY, legWidth, legHeight, 'leftLeg');
    drawCubeFace(4, 20, 4, 12, rightLegX, legY, legWidth, legHeight, 'rightLeg');

    ctx.restore();
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
      for (let dx = 0; dx < brushSize; dx++) {
        for (let dy = 0; dy < brushSize; dy++) {
          const px = x + dx;
          const py = y + dy;
          if (px < SKIN_WIDTH && py < SKIN_HEIGHT) {
            ctx.fillStyle = currentColor;
            ctx.fillRect(px, py, 1, 1);
          }
        }
      }
      saveToHistory();
    } else if (tool === 'eraser') {
      ctx.clearRect(x, y, brushSize, brushSize);
      saveToHistory();
    } else if (tool === 'eyedropper') {
      const imageData = ctx.getImageData(x, y, 1, 1);
      const [r, g, b] = imageData.data;
      setCurrentColor(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
      setTool('brush');
      toast.success('Цвет выбран!');
    } else if (tool === 'fill') {
      floodFill(ctx, x, y, currentColor);
      saveToHistory();
    }

    drawPreview();
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
        
        saveToHistory();
        drawPreview();
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#C6C6C6';
    ctx.fillRect(0, 0, SKIN_WIDTH, SKIN_HEIGHT);
    
    saveToHistory();
    drawPreview();
    toast.success('Холст очищен!');
  };

  const togglePartVisibility = (part: BodyPart) => {
    setVisibleParts(prev => ({ ...prev, [part]: !prev[part] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 pt-8">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
            SkinLoder
          </h1>
          <p className="text-lg text-muted-foreground">Профессиональный редактор скинов Minecraft</p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="editor">Редактор</TabsTrigger>
            <TabsTrigger value="guide">Инструкция</TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <div className="grid lg:grid-cols-[380px_1fr] gap-6">
              <div className="space-y-4">
                <Card className="p-6 shadow-xl backdrop-blur-sm bg-white/80">
                  <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                    3D Превью
                  </h2>
                  <div className="bg-gradient-to-b from-sky-400 to-green-400 rounded-xl overflow-hidden flex items-center justify-center" style={{ height: '350px' }}>
                    <canvas
                      ref={previewCanvasRef}
                      width={350}
                      height={350}
                      className="cursor-pointer"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Вид</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button size="sm" variant={viewAngle === 'front' ? 'default' : 'outline'} onClick={() => setViewAngle('front')}>
                          <Icon name="User" size={14} className="mr-1" /> Спереди
                        </Button>
                        <Button size="sm" variant={viewAngle === 'back' ? 'default' : 'outline'} onClick={() => setViewAngle('back')}>
                          <Icon name="UserX" size={14} className="mr-1" /> Сзади
                        </Button>
                        <Button size="sm" variant={viewAngle === 'left' ? 'default' : 'outline'} onClick={() => setViewAngle('left')}>
                          <Icon name="ChevronLeft" size={14} className="mr-1" /> Слева
                        </Button>
                        <Button size="sm" variant={viewAngle === 'right' ? 'default' : 'outline'} onClick={() => setViewAngle('right')}>
                          <Icon name="ChevronRight" size={14} className="mr-1" /> Справа
                        </Button>
                        <Button size="sm" variant={viewAngle === 'top' ? 'default' : 'outline'} onClick={() => setViewAngle('top')}>
                          <Icon name="ChevronUp" size={14} className="mr-1" /> Сверху
                        </Button>
                        <Button size="sm" variant={viewAngle === 'bottom' ? 'default' : 'outline'} onClick={() => setViewAngle('bottom')}>
                          <Icon name="ChevronDown" size={14} className="mr-1" /> Снизу
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Модель</Label>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1" 
                          variant={modelType === 'steve' ? 'default' : 'outline'}
                          onClick={() => setModelType('steve')}
                        >
                          Стив (4px руки)
                        </Button>
                        <Button 
                          className="flex-1" 
                          variant={modelType === 'alex' ? 'default' : 'outline'}
                          onClick={() => setModelType('alex')}
                        >
                          Алекс (3px руки)
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="overlay">Показать второй слой</Label>
                      <Switch id="overlay" checked={showOverlay} onCheckedChange={setShowOverlay} />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Видимость частей</Label>
                      <div className="space-y-2">
                        {Object.entries(visibleParts).map(([part, visible]) => (
                          <div key={part} className="flex items-center justify-between">
                            <Label className="text-xs">{
                              part === 'head' ? 'Голова' :
                              part === 'body' ? 'Тело' :
                              part === 'leftArm' ? 'Левая рука' :
                              part === 'rightArm' ? 'Правая рука' :
                              part === 'leftLeg' ? 'Левая нога' : 'Правая нога'
                            }</Label>
                            <Switch 
                              checked={visible} 
                              onCheckedChange={() => togglePartVisibility(part as BodyPart)}
                              className="scale-75"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6 shadow-xl backdrop-blur-sm bg-white/80">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Текстура скина
                  </h2>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={undo} disabled={historyIndex <= 0}>
                      <Icon name="Undo" size={16} />
                    </Button>
                    <Button size="sm" variant="outline" onClick={redo} disabled={historyIndex >= history.length - 1}>
                      <Icon name="Redo" size={16} />
                    </Button>
                  </div>
                </div>
                
                <div className="bg-gray-100 p-4 rounded-xl mb-6 border-2 border-gray-200">
                  <canvas
                    ref={canvasRef}
                    width={SKIN_WIDTH}
                    height={SKIN_HEIGHT}
                    onClick={handleCanvasClick}
                    className="w-full h-auto cursor-crosshair border-2 border-gray-300 rounded"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    width={SKIN_WIDTH}
                    height={SKIN_HEIGHT}
                    className="hidden"
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
                    
                    {(tool === 'brush' || tool === 'eraser') && (
                      <div className="mt-3">
                        <Label className="text-xs mb-2 block">Размер: {brushSize}px</Label>
                        <input 
                          type="range" 
                          min="1" 
                          max="5" 
                          value={brushSize} 
                          onChange={(e) => setBrushSize(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )}
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
                    <Icon name="Eye" size={24} className="text-green-500" />
                    Виды и модели
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Переключайте вид модели (спереди, сзади, слева, справа, сверху, снизу) для удобного редактирования всех сторон.
                    Выбирайте между моделями Стив (широкие руки 4px) и Алекс (тонкие руки 3px).
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border-l-4 border-blue-500">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-3">
                    <Icon name="Layers" size={24} className="text-blue-500" />
                    Второй слой (Overlay)
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Включите "Показать второй слой" для работы с объемными элементами — шапками, одеждой, аксессуарами.
                    Это позволяет создавать многослойные детализированные скины.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border-l-4 border-purple-500">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-3">
                    <Icon name="Pencil" size={24} className="text-purple-500" />
                    Инструменты рисования
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Кисть с настройкой размера (1-5px), ластик, заливка и пипетка. Используйте Ctrl+Z / Ctrl+Y для отмены и повтора действий.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border-l-4 border-yellow-500">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-3">
                    <Icon name="Lightbulb" size={24} className="text-yellow-600" />
                    Управление частями
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Скрывайте/показывайте отдельные части тела для удобства редактирования. Выделите часть тела для фокусировки на конкретном элементе.
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
