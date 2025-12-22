import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ComponentRepository } from "@/services/components/ComponentRepository";
import { IComponentData } from "@/services/components/ComponentDomain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarEvent } from "@/services/calendar/CalendarEventDomain";
import { CalendarEventService } from "@/services/calendar/CalendarEventService";
import { ScheduledInteractionMapper } from "@/services/calendar/ScheduledInteractionMapper";

export const Calendar = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [meetingSchedulerComponent, setMeetingSchedulerComponent] =
    useState<IComponentData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionProvider, setConnectionProvider] = useState<string | null>(
    null
  );
  const componentRepository = new ComponentRepository();
  const calendarEventService = new CalendarEventService();
  const scheduledInteractionMapper = new ScheduledInteractionMapper();

  useEffect(() => {
    loadMeetingSchedulerComponent();
    loadCalendarEvents();
  }, []);

  useEffect(() => {
    loadCalendarEvents();
  }, [currentDate, isConnected]);

  const loadMeetingSchedulerComponent = async () => {
    try {
      const components = await componentRepository.findAll();
      const scheduler = components.find(
        (c) => c.identifier === "meeting_scheduler"
      );

      if (scheduler) {
        setMeetingSchedulerComponent(scheduler);
        checkConnection(scheduler.id);
      }
    } catch (error) {
      console.error("Erro ao carregar componente de agendamento:", error);
    }
  };

  const checkConnection = async (componentId: string) => {
    try {
      const { data, error } = await supabase
        .from("component_configurations")
        .select("config")
        .eq("component_id", componentId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao verificar conexão:", error);
        return;
      }

      if (data?.config) {
        const config = data.config;
        const connected =
          (config.connected || config.oauth_provider) && config.oauth_token;
        setIsConnected(!!connected);
        setConnectionProvider(config.oauth_provider || null);
      } else {
        setIsConnected(false);
        setConnectionProvider(null);
      }
    } catch (error) {
      console.error("Erro ao verificar conexão:", error);
    }
  };

  const loadCalendarEvents = async () => {
    setLoading(true);
    try {
      const allEvents: CalendarEvent[] = [];

      if (isConnected && connectionProvider) {
        const calendarEvents = await fetchCalendarEvents(connectionProvider);
        allEvents.push(...calendarEvents);
      }

      const scheduledEvents = await loadScheduledInteractions();
      allEvents.push(...scheduledEvents);

      setEvents(allEvents);
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
      toast.error("Erro ao carregar eventos do calendário");
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarEvents = async (
    provider: string
  ): Promise<CalendarEvent[]> => {
    try {
      const normalizedProvider = normalizeProviderForService(provider) as
        | "google"
        | "outlook";

      return await calendarEventService.fetchEvents(normalizedProvider, {
        startDate: getStartOfPeriod(currentDate, view),
        endDate: getEndOfPeriod(currentDate, view),
      });
    } catch (error) {
      console.error("Erro ao buscar eventos do calendário:", error);
      toast.error("Erro ao buscar eventos do calendário");
      return [];
    }
  };

  const normalizeProviderForService = (
    provider: string
  ): "google" | "outlook" => {
    if (provider === "google" || provider === "google_calendar") {
      return "google";
    }
    return "outlook";
  };

  const loadScheduledInteractions = async (): Promise<CalendarEvent[]> => {
    try {
      const { data, error } = await supabase
        .from("scheduled_interactions")
        .select(
          `
          *,
          leads (
            name,
            contact_email,
            contact_whatsapp
          )
        `
        )
        .gte("scheduled_at", getStartOfPeriod(currentDate, view).toISOString())
        .lte("scheduled_at", getEndOfPeriod(currentDate, view).toISOString())
        .eq("status", "pending");

      if (error) throw error;

      return (data || []).map((interaction) =>
        scheduledInteractionMapper.map(interaction)
      );
    } catch (error) {
      console.error("Erro ao carregar interações agendadas:", error);
      return [];
    }
  };

  const getStartOfPeriod = (
    date: Date,
    view: "month" | "week" | "day"
  ): Date => {
    const d = new Date(date);
    if (view === "month") {
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
    } else if (view === "week") {
      const day = d.getDay();
      d.setDate(d.getDate() - day);
      d.setHours(0, 0, 0, 0);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    return d;
  };

  const getEndOfPeriod = (date: Date, view: "month" | "week" | "day"): Date => {
    const d = new Date(date);
    if (view === "month") {
      d.setMonth(d.getMonth() + 1);
      d.setDate(0);
      d.setHours(23, 59, 59, 999);
    } else if (view === "week") {
      d.setDate(d.getDate() + (6 - d.getDay()));
      d.setHours(23, 59, 59, 999);
    } else {
      d.setHours(23, 59, 59, 999);
    }
    return d;
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
      ...(view === "week" && { day: "numeric" }),
    });
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
      days.push(new Date(year, month, -startDay + i + 1));
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter((event) => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const days = view === "month" ? getDaysInMonth(currentDate) : [];
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Calendário</h1>
            <p className="text-muted-foreground mt-1">
              Visualize e gerencie seus agendamentos e reuniões
            </p>
          </div>
          <div className="flex items-center gap-2">
            {meetingSchedulerComponent && (
              <Button
                variant="outline"
                onClick={() =>
                  navigate(
                    `/components/${meetingSchedulerComponent.id}/configure`
                  )
                }
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Configurar Agendamento
              </Button>
            )}
          </div>
        </div>

        {!isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Conecte seu calendário para visualizar seus eventos.{" "}
              {meetingSchedulerComponent && (
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={() =>
                    navigate(
                      `/components/${meetingSchedulerComponent.id}/configure`
                    )
                  }
                >
                  Conectar agora
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs
          value={view}
          onValueChange={(v) => setView(v as "month" | "week" | "day")}
        >
          <TabsList>
            <TabsTrigger value="month">Mês</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="day">Dia</TabsTrigger>
          </TabsList>

          <TabsContent value={view} className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigateDate("prev")}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h2 className="text-xl font-semibold capitalize">
                      {formatDate(currentDate)}
                    </h2>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigateDate("next")}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentDate(new Date())}
                    >
                      Hoje
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : view === "month" ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {weekDays.map((day) => (
                        <div
                          key={day}
                          className="text-center text-sm font-medium text-muted-foreground p-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {days.map((day, index) => {
                        const dayEvents = getEventsForDay(day);
                        return (
                          <div
                            key={index}
                            className={`min-h-[100px] border rounded-lg p-2 ${
                              !isCurrentMonth(day)
                                ? "bg-muted/30 opacity-50"
                                : "bg-card"
                            } ${isToday(day) ? "ring-2 ring-primary" : ""}`}
                          >
                            <div
                              className={`text-sm font-medium mb-1 ${
                                isToday(day) ? "text-primary" : ""
                              }`}
                            >
                              {day.getDate()}
                            </div>
                            <div className="space-y-1">
                              {dayEvents.slice(0, 3).map((event) => (
                                <div
                                  key={event.id}
                                  className="text-xs p-1 rounded truncate"
                                  style={{
                                    backgroundColor: `${
                                      event.color || "#3B82F6"
                                    }20`,
                                    borderLeft: `3px solid ${
                                      event.color || "#3B82F6"
                                    }`,
                                  }}
                                  title={event.title}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{dayEvents.length - 3} mais
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Visualização de semana e dia em desenvolvimento
                  </div>
                )}
              </CardContent>
            </Card>

            {events.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Próximos Eventos</CardTitle>
                  <CardDescription>
                    {events.length} evento(s) no período selecionado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {events
                      .sort((a, b) => a.start.getTime() - b.start.getTime())
                      .slice(0, 10)
                      .map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div
                            className="w-1 h-full rounded-full"
                            style={{
                              backgroundColor: event.color || "#3B82F6",
                            }}
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{event.title}</h3>
                              <Badge variant="outline" className="text-xs">
                                {event.source === "google"
                                  ? "Google Calendar"
                                  : event.source === "outlook"
                                  ? "Outlook"
                                  : "Agendado"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {event.start.toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                -{" "}
                                {event.end.toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              {event.location &&
                                String(event.location).trim() && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {String(event.location)}
                                  </div>
                                )}
                              {event.attendees &&
                                event.attendees.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {event.attendees.length} participante(s)
                                  </div>
                                )}
                            </div>
                            {event.description &&
                              String(event.description).trim() && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {String(event.description)}
                                </p>
                              )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};
