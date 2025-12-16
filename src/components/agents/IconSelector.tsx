import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SmilePlus,
  Upload,
  Rocket,
  Bot,
  Briefcase,
  Headphones,
  Phone,
  Calendar,
  Lightbulb,
  Wrench,
  Target,
  Gem,
  BarChart3,
  Megaphone,
  FileText,
  Zap,
  Brain,
  MessageSquare,
  Users,
  ShoppingCart,
  Heart,
  Star,
  Shield,
  Sparkles,
  TrendingUp,
  HelpCircle,
  CheckCircle,
  AlertCircle,
  Settings,
  Mail,
  Video,
  Camera,
  Palette,
  Music,
  Gamepad,
  BookOpen,
  GraduationCap,
  Code,
  Database,
  Cloud,
  Globe,
  MapPin,
  Building2,
  Home,
  Car,
  Plane,
  Ship,
  Train,
  Coffee,
  Dumbbell,
  Activity,
  Stethoscope,
  Pill,
  Microscope,
  Beaker,
  Edit,
  Image,
  Film,
  Radio,
  Tv,
  Laptop,
  Smartphone,
  Tablet,
  Watch,
  Speaker,
  Keyboard,
  Mouse,
  Monitor,
  Printer,
  HardDrive,
  Server,
  Router,
  Wifi,
  Bluetooth,
  Battery,
  Power,
  Sun,
  Moon,
  Wind,
  Droplet,
  Flame,
  Snowflake,
  Leaf,
  Mountain,
  Waves,
  Fish,
  Bird,
  Cat,
  Dog,
  Rabbit,
  PawPrint,
  Bug,
  type LucideIcon,
} from "lucide-react";

interface IconSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

interface IconOption {
  name: string;
  icon: LucideIcon;
  iconName: string;
  category: string;
}

const ICON_CATEGORIES = {
  business: [
    { name: "Negócios", icon: Briefcase, iconName: "Briefcase" },
    { name: "Vendas", icon: ShoppingCart, iconName: "ShoppingCart" },
    { name: "Gráficos", icon: BarChart3, iconName: "BarChart3" },
    { name: "Tendências", icon: TrendingUp, iconName: "TrendingUp" },
    { name: "Empresa", icon: Building2, iconName: "Building2" },
    { name: "Usuários", icon: Users, iconName: "Users" },
  ],
  communication: [
    { name: "Mensagem", icon: MessageSquare, iconName: "MessageSquare" },
    { name: "Telefone", icon: Phone, iconName: "Phone" },
    { name: "Email", icon: Mail, iconName: "Mail" },
    { name: "Vídeo", icon: Video, iconName: "Video" },
    { name: "Megafone", icon: Megaphone, iconName: "Megaphone" },
    { name: "Rádio", icon: Radio, iconName: "Radio" },
  ],
  technology: [
    { name: "Bot", icon: Bot, iconName: "Bot" },
    { name: "Código", icon: Code, iconName: "Code" },
    { name: "Banco de Dados", icon: Database, iconName: "Database" },
    { name: "Nuvem", icon: Cloud, iconName: "Cloud" },
    { name: "Servidor", icon: Server, iconName: "Server" },
    { name: "Roteador", icon: Router, iconName: "Router" },
    { name: "WiFi", icon: Wifi, iconName: "Wifi" },
    { name: "Bluetooth", icon: Bluetooth, iconName: "Bluetooth" },
    { name: "Laptop", icon: Laptop, iconName: "Laptop" },
    { name: "Smartphone", icon: Smartphone, iconName: "Smartphone" },
    { name: "Tablet", icon: Tablet, iconName: "Tablet" },
    { name: "Monitor", icon: Monitor, iconName: "Monitor" },
    { name: "Impressora", icon: Printer, iconName: "Printer" },
    { name: "HD", icon: HardDrive, iconName: "HardDrive" },
  ],
  general: [
    { name: "Foguete", icon: Rocket, iconName: "Rocket" },
    { name: "Alvo", icon: Target, iconName: "Target" },
    { name: "Estrela", icon: Star, iconName: "Star" },
    { name: "Escudo", icon: Shield, iconName: "Shield" },
    { name: "Brilho", icon: Sparkles, iconName: "Sparkles" },
    { name: "Raio", icon: Zap, iconName: "Zap" },
    { name: "Cérebro", icon: Brain, iconName: "Brain" },
    { name: "Lâmpada", icon: Lightbulb, iconName: "Lightbulb" },
    { name: "Ferramenta", icon: Wrench, iconName: "Wrench" },
    { name: "Configurações", icon: Settings, iconName: "Settings" },
    { name: "Ajuda", icon: HelpCircle, iconName: "HelpCircle" },
    { name: "Check", icon: CheckCircle, iconName: "CheckCircle" },
    { name: "Alerta", icon: AlertCircle, iconName: "AlertCircle" },
  ],
  media: [
    { name: "Câmera", icon: Camera, iconName: "Camera" },
    { name: "Imagem", icon: Image, iconName: "Image" },
    { name: "Filme", icon: Film, iconName: "Film" },
    { name: "TV", icon: Tv, iconName: "Tv" },
    { name: "Música", icon: Music, iconName: "Music" },
    { name: "Paleta", icon: Palette, iconName: "Palette" },
    { name: "Editar", icon: Edit, iconName: "Edit" },
  ],
  lifestyle: [
    { name: "Casa", icon: Home, iconName: "Home" },
    { name: "Carro", icon: Car, iconName: "Car" },
    { name: "Avião", icon: Plane, iconName: "Plane" },
    { name: "Navio", icon: Ship, iconName: "Ship" },
    { name: "Trem", icon: Train, iconName: "Train" },
    { name: "Café", icon: Coffee, iconName: "Coffee" },
    { name: "Academia", icon: Dumbbell, iconName: "Dumbbell" },
    { name: "Saúde", icon: Activity, iconName: "Activity" },
    { name: "Jogo", icon: Gamepad, iconName: "Gamepad" },
  ],
  education: [
    { name: "Livro", icon: BookOpen, iconName: "BookOpen" },
    { name: "Graduação", icon: GraduationCap, iconName: "GraduationCap" },
    { name: "Microscópio", icon: Microscope, iconName: "Microscope" },
    { name: "Frasco", icon: Beaker, iconName: "Beaker" },
  ],
  health: [
    { name: "Coração", icon: Heart, iconName: "Heart" },
    { name: "Estetoscópio", icon: Stethoscope, iconName: "Stethoscope" },
    { name: "Pílula", icon: Pill, iconName: "Pill" },
  ],
  nature: [
    { name: "Folha", icon: Leaf, iconName: "Leaf" },
    { name: "Montanha", icon: Mountain, iconName: "Mountain" },
    { name: "Ondas", icon: Waves, iconName: "Waves" },
    { name: "Peixe", icon: Fish, iconName: "Fish" },
    { name: "Pássaro", icon: Bird, iconName: "Bird" },
    { name: "Gato", icon: Cat, iconName: "Cat" },
    { name: "Cachorro", icon: Dog, iconName: "Dog" },
    { name: "Coelho", icon: Rabbit, iconName: "Rabbit" },
    { name: "Pata", icon: PawPrint, iconName: "PawPrint" },
    { name: "Inseto", icon: Bug, iconName: "Bug" },
  ],
  weather: [
    { name: "Sol", icon: Sun, iconName: "Sun" },
    { name: "Lua", icon: Moon, iconName: "Moon" },
    { name: "Nuvem", icon: Cloud, iconName: "Cloud" },
    { name: "Vento", icon: Wind, iconName: "Wind" },
    { name: "Gota", icon: Droplet, iconName: "Droplet" },
    { name: "Fogo", icon: Flame, iconName: "Flame" },
    { name: "Floco", icon: Snowflake, iconName: "Snowflake" },
  ],
  time: [
    { name: "Calendário", icon: Calendar, iconName: "Calendar" },
    { name: "Relógio", icon: Watch, iconName: "Watch" },
  ],
  documents: [
    { name: "Documento", icon: FileText, iconName: "FileText" },
    { name: "Localização", icon: MapPin, iconName: "MapPin" },
  ],
  accessories: [
    { name: "Fone", icon: Headphones, iconName: "Headphones" },
    { name: "Alto-falante", icon: Speaker, iconName: "Speaker" },
    { name: "Teclado", icon: Keyboard, iconName: "Keyboard" },
    { name: "Mouse", icon: Mouse, iconName: "Mouse" },
    { name: "Bateria", icon: Battery, iconName: "Battery" },
    { name: "Energia", icon: Power, iconName: "Power" },
  ],
};

const EMOJI_ICONS = [
  "🚀", "🤖", "💼", "🎧", "📞", "📅", "💡", "🛠️", "🎯", "💎", 
  "📊", "📣", "📝", "⚡️", "🧠", "💬", "👥", "🛒", "❤️", "⭐",
  "🛡️", "✨", "📈", "❓", "✅", "⚠️", "⚙️", "📧", "🎥", "📷",
  "🎨", "🎵", "🎮", "📚", "🎓", "💻", "📱", "⌚", "🔊", "⌨️",
  "🖱️", "🖨️", "💾", "🖥️", "🌐", "📍", "🏢", "🏠", "🚗", "✈️",
  "🚢", "🚂", "☕", "🍽️", "💪", "❤️‍🩹", "🏥", "💊", "🔬", "🧪",
  "🌱", "🌸", "🌲", "⛰️", "🌊", "🐟", "🐦", "🐱", "🐶", "🐰",
  "🐾", "🐛", "🐝", "🦋", "☀️", "🌙", "🌧️", "❄️", "💨", "💧",
  "🔥", "❄️", "🌍", "🗺️"
];

export const IconSelector = ({ value, onChange }: IconSelectorProps) => {
  const [urlValue, setUrlValue] = useState(value?.startsWith("http") ? value : "");
  const [activeCategory, setActiveCategory] = useState<string>("business");

  const handleIconSelect = (iconName: string) => {
    onChange(`icon:${iconName}`);
  };

  const handleEmojiSelect = (emoji: string) => {
    onChange(`emoji:${emoji}`);
  };

  const handleUrlSave = () => {
    if (urlValue.trim().length === 0) {
      onChange(null);
      return;
    }
    onChange(urlValue.trim());
  };

  const getIconFromValue = () => {
    if (!value) return null;
    if (value.startsWith("icon:")) {
      const iconName = value.replace("icon:", "");
      const allIcons = Object.values(ICON_CATEGORIES).flat();
      const found = allIcons.find((item) => item.iconName === iconName);
      return found ? found.icon : null;
    }
    return null;
  };

  const getEmojiFromValue = () => {
    if (!value) return null;
    if (value.startsWith("emoji:")) {
      return value.replace("emoji:", "");
    }
    return null;
  };

  const SelectedIcon = getIconFromValue();
  const selectedEmoji = getEmojiFromValue();

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SmilePlus className="w-4 h-4 text-primary" />
          <p className="font-semibold">Ícone do agente</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
          Remover
        </Button>
      </div>

      {(SelectedIcon || selectedEmoji || value?.startsWith("http")) && (
        <div className="p-3 bg-muted rounded-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            {SelectedIcon ? (
              <SelectedIcon className="w-5 h-5 text-primary" />
            ) : selectedEmoji ? (
              <span className="text-xl">{selectedEmoji}</span>
            ) : value?.startsWith("http") ? (
              <img src={value} alt="Avatar" className="w-10 h-10 rounded-md object-cover" />
            ) : null}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Ícone selecionado</p>
            <p className="text-xs text-muted-foreground">
              {SelectedIcon ? "Ícone Lucide" : selectedEmoji ? "Emoji" : "URL de imagem"}
            </p>
          </div>
        </div>
      )}

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="icons">Ícones</TabsTrigger>
          <TabsTrigger value="emojis">Emojis</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
        </TabsList>

        <TabsContent value="icons" className="space-y-4">
          <div className="space-y-3">
            {Object.entries(ICON_CATEGORIES).map(([categoryKey, icons]) => (
              <div key={categoryKey} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  {categoryKey === "business" && "Negócios"}
                  {categoryKey === "communication" && "Comunicação"}
                  {categoryKey === "technology" && "Tecnologia"}
                  {categoryKey === "general" && "Geral"}
                  {categoryKey === "media" && "Mídia"}
                  {categoryKey === "lifestyle" && "Estilo de Vida"}
                  {categoryKey === "education" && "Educação"}
                  {categoryKey === "health" && "Saúde"}
                  {categoryKey === "nature" && "Natureza"}
                  {categoryKey === "weather" && "Clima"}
                  {categoryKey === "time" && "Tempo"}
                  {categoryKey === "documents" && "Documentos"}
                  {categoryKey === "accessories" && "Acessórios"}
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {icons.map((item) => {
                    const IconComponent = item.icon;
                    const isSelected = value === `icon:${item.iconName}`;
                    return (
                      <button
                        key={item.iconName}
                        type="button"
                        className={`h-12 rounded-md border flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-muted hover:border-primary/60"
                        }`}
                        onClick={() => handleIconSelect(item.iconName)}
                        title={item.name}
                      >
                        <IconComponent className={`w-5 h-5 ${isSelected ? "text-primary" : ""}`} />
                        <span className="text-[10px] text-muted-foreground truncate w-full px-1">
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="emojis" className="space-y-2">
          <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
            {EMOJI_ICONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`h-10 rounded-md border text-lg flex items-center justify-center transition-all ${
                  value === `emoji:${emoji}`
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:border-primary/60"
                }`}
                onClick={() => handleEmojiSelect(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="url" className="space-y-2">
          <Input
            placeholder="https://link-da-imagem.com/avatar.png"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
          />
          <Button onClick={handleUrlSave} className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Salvar URL
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

