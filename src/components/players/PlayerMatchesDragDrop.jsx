import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Star, X, GripVertical } from "lucide-react";

const priorityColors = {
  niedrig: "bg-emerald-100 text-emerald-800",
  mittel: "bg-yellow-100 text-yellow-800",
  hoch: "bg-orange-100 text-orange-800",
  dringend: "bg-red-100 text-red-800",
};

export default function PlayerMatchesDragDrop({ 
  favoriteMatches, 
  offeredRequests, 
  clubRequests,
  onUpdateOffered,
  onNavigateToRequest
}) {
  const offeredRequestIds = offeredRequests || [];
  
  // Favoriten die noch nicht angeboten wurden
  const availableFavorites = favoriteMatches.filter(
    reqId => !offeredRequestIds.includes(reqId)
  );

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    
    if (!destination) return;
    
    // Von Favoriten zu Angeboten
    if (source.droppableId === "favorites" && destination.droppableId === "offered") {
      const newOffered = [...offeredRequestIds, draggableId];
      onUpdateOffered(newOffered);
    }
    
    // Von Angeboten zurück zu Favoriten
    if (source.droppableId === "offered" && destination.droppableId === "favorites") {
      const newOffered = offeredRequestIds.filter(id => id !== draggableId);
      onUpdateOffered(newOffered);
    }
  };

  const handleRemoveFromOffered = (requestId) => {
    const newOffered = offeredRequestIds.filter(id => id !== requestId);
    onUpdateOffered(newOffered);
  };

  const getRequestData = (requestId) => {
    return clubRequests.find(r => r.id === requestId);
  };

  const renderRequestCard = (requestId, index, isDraggable = true) => {
    const request = getRequestData(requestId);
    if (!request) return null;

    const content = (
      <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
        {isDraggable && (
          <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0 cursor-grab" />
        )}
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onNavigateToRequest(requestId)}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-900 flex-shrink-0" />
            <span className="font-medium text-slate-900 truncate">{request.club_name}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">{request.position_needed}</span>
            <Badge variant="secondary" className={`${priorityColors[request.priority]} text-xs`}>
              {request.priority}
            </Badge>
          </div>
        </div>
      </div>
    );

    if (!isDraggable) {
      return (
        <div key={requestId} className="relative group">
          {content}
          <button
            onClick={() => handleRemoveFromOffered(requestId)}
            className="absolute -top-2 -right-2 p-1 bg-red-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
          >
            <X className="w-3 h-3 text-red-600" />
          </button>
        </div>
      );
    }

    return (
      <Draggable key={requestId} draggableId={requestId} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={snapshot.isDragging ? "opacity-75" : ""}
          >
            {content}
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Favorisierte Matches */}
        <Droppable droppableId="favorites">
          {(provided, snapshot) => (
            <Card className={`border-slate-200 bg-white ${snapshot.isDraggingOver ? 'ring-2 ring-blue-300' : ''}`}>
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <CardTitle className="text-lg">Favorisierte Matches</CardTitle>
                  <Badge variant="outline" className="ml-auto">{availableFavorites.length}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Ziehen Sie Vereine nach rechts, um sie als "angeboten" zu markieren
                </p>
              </CardHeader>
              <CardContent 
                className="p-4 min-h-[200px]"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {availableFavorites.length > 0 ? (
                  <div className="space-y-2">
                    {availableFavorites.map((requestId, index) => 
                      renderRequestCard(requestId, index, true)
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                    Keine verfügbaren Favoriten
                  </div>
                )}
                {provided.placeholder}
              </CardContent>
            </Card>
          )}
        </Droppable>

        {/* Angeboten bei Vereinen */}
        <Droppable droppableId="offered">
          {(provided, snapshot) => (
            <Card className={`border-green-200 bg-green-50/50 ${snapshot.isDraggingOver ? 'ring-2 ring-green-400' : ''}`}>
              <CardHeader className="border-b border-green-200">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-green-700" />
                  <CardTitle className="text-lg text-green-900">Angeboten bei Vereinen</CardTitle>
                  <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800">
                    {offeredRequestIds.length}
                  </Badge>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Spieler wird bei diesen Vereinsanfragen als "angeboten" angezeigt
                </p>
              </CardHeader>
              <CardContent 
                className="p-4 min-h-[200px]"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {offeredRequestIds.length > 0 ? (
                  <div className="space-y-2">
                    {offeredRequestIds.map((requestId, index) => 
                      renderRequestCard(requestId, index, false)
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-green-600 text-sm border-2 border-dashed border-green-300 rounded-lg">
                    Hierher ziehen zum Anbieten
                  </div>
                )}
                {provided.placeholder}
              </CardContent>
            </Card>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}