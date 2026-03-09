import React, { useState } from "react";
import { Building2, MapPin, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import StudentRegistration from "@/components/StudentRegistration";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Converts "02 October 2025" to "2025-10-02"
function eventDateFromFormatted(formatted: string) {
  if (!formatted) return "";
  const parts = formatted.trim().split(" ");
  if (parts.length < 3) return "";
  const [day, monthName, year] = parts;
  const month = (
    [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ].indexOf(monthName) + 1
  )
    .toString()
    .padStart(2, "0");
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

// Returns yyyy-mm-dd if already in that format, else converts
function formattedDateToInput(date: string) {
  if (!date) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return eventDateFromFormatted(date);
}

// Converts "10:00 AM - 12:00 PM" or "10:00 AM" to "10:00"
function timeToInput(timeRange: string) {
  if (!timeRange) return "";
  const first = timeRange.split(" - ")[0];
  const parts = first.split(" ");
  if (parts.length === 1) return parts[0]; // already in HH:MM
  const [time, ampm] = parts;
  let [h, m] = time.split(":");
  if (!m) m = "00";
  let hour = parseInt(h, 10);
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, "0")}:${m.padStart(2, "0")}`;
}

type EventCardProps = {
  id?: string;
  name: string;
  image: string;
  collegeName: string;
  venue: string;
  formattedDate: string;
  time: string;
  status: string;
  description?: string;
  end_time?: string;
  onRegister?: (student?: any) => void;
  onCancel?: () => void;
  isRegistered?: boolean;
  isFirstTime?: boolean;
  isAdmin?: boolean;
  onDelete?: () => void;
  onUpdate?: (editEvent: any, closeDialog: () => void) => void;
  ticketQr?: string | null;
  ticketId?: string | null;
  attended?: boolean;
};

const EventCard: React.FC<EventCardProps> = ({
  id,
  name,
  image,
  collegeName,
  venue,
  formattedDate,
  time,
  status,
  description,
  end_time,
  onRegister,
  onCancel,
  isRegistered,
  isFirstTime,
  isAdmin,
  onDelete,
  onUpdate,
  ticketQr,
  ticketId,
  attended,
}) => {
  // Dialog state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [studentRegOpen, setStudentRegOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const [editEvent, setEditEvent] = useState({
    title: name,
    description: description || "",
    date: formattedDateToInput(formattedDate),
    time: timeToInput(time),
    end_time: end_time || "",
    venue: venue || "",
    collegeName: collegeName || "",
    image: image || "",
    id: id,
  });

  const [showTicket, setShowTicket] = useState(false);

  // Normalize incoming props to avoid whitespace/case issues
  const normalizedStatus = (status || "").toString().trim().toLowerCase();
  const registered = !!isRegistered;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // prevent opening when clicking interactive elements
    if ((e.target as HTMLElement).closest("button")) return;
    setDetailsOpen(true);
  };

  const navigate = useNavigate();
  const handleRegisterClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user ?? null;
      if (!user) {
        // Redirect unauthenticated users to signup; include redirect back to events
        const redirect = encodeURIComponent("/events");
        navigate(`/signup?redirect=${redirect}`);
        return;
      }
      setStudentRegOpen(true);
    } catch (err) {
      // On error, fallback to redirect to signup
      navigate(`/signup?redirect=${encodeURIComponent("/events")}`);
    }
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCancelConfirmOpen(true);
  };

  const getStatusBadge = () => {
    if (normalizedStatus === "upcoming") {
      return (
        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Upcoming</span>
      );
    }
    if (normalizedStatus === "ongoing") {
      return (
        <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">Ongoing</span>
      );
    }
    if (normalizedStatus === "completed") {
      return (
        <span className="px-3 py-1 rounded-full bg-gray-200 text-gray-600 text-xs font-medium">Completed</span>
      );
    }
    if (normalizedStatus === "today") {
      return (
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Today</span>
      );
    }
    if (normalizedStatus === "tomorrow") {
      return (
        <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">Tomorrow</span>
      );
    }
    return null;
  };

  return (
    <>
      {/* Card */}
      <div
        className="group relative overflow-hidden rounded-xl bg-card shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-in cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Status Badge */}
        <div className="absolute top-3 right-3 z-10">{getStatusBadge()}</div>

        {/* Image */}
        <div className="relative h-56 overflow-hidden bg-gradient-card">
          {image && image.trim() !== "" && (
            <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <h3 className="text-xl font-semibold line-clamp-1 truncate">{name}</h3>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="truncate">{collegeName}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{venue}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{time}</span>
            </div>

            {/* Actions for non-admin users */}
            {!isAdmin && (
              <div>
                {registered ? (
                  // Registered users: show Cancel Registration (enabled only for upcoming/tomorrow)
                  (normalizedStatus === "upcoming" || normalizedStatus === "tomorrow") ? (
                    <>
                      <Button
                        className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
                        onClick={handleCancelClick}
                      >
                        Cancel Registration
                      </Button>

                      {/* Cancel Confirmation Dialog */}
                      <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Cancel Registration</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to cancel your registration for <b>{name}</b>?
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setCancelConfirmOpen(false)}>
                              No
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                onCancel && onCancel();
                                setCancelConfirmOpen(false);
                              }}
                            >
                              Yes, Cancel
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : (
                    // Registered but cannot cancel now: show disabled Cancel with blocked icon
                    <div className="flex flex-col items-center justify-center mb-2">
                      <Button
                        className="w-full bg-gradient-hero opacity-50 cursor-not-allowed relative"
                        disabled
                        onClick={(e) => e.stopPropagation()}
                      >
                        Cancel Registration
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" strokeWidth="3" className="text-red-600 drop-shadow-lg">
                            <circle cx="12" cy="12" r="10" stroke="red" strokeWidth="3" fill="none" />
                            <line x1="6" y1="6" x2="18" y2="18" stroke="red" strokeWidth="3" />
                          </svg>
                        </span>
                      </Button>
                    </div>
                  )
                ) : (
                  // Not registered: show Register Now when allowed, otherwise disabled Register
                  (normalizedStatus === "upcoming" || normalizedStatus === "tomorrow") ? (
                    <>
                      <Button
                        className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
                        onClick={handleRegisterClick}
                      >
                        Register Now
                      </Button>

                      <StudentRegistration
                        open={studentRegOpen}
                        setOpen={setStudentRegOpen}
                        eventName={name}
                        firstTimeUser={isFirstTime}
                        onRegistered={(student) => {
                          // after successful student save, continue with event registration
                          onRegister && onRegister(student);
                        }}
                      />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center mb-2">
                      <Button
                        className="w-full bg-gradient-hero opacity-50 cursor-not-allowed relative"
                        disabled
                        onClick={(e) => e.stopPropagation()}
                      >
                        Register Now
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" strokeWidth="3" className="text-red-600 drop-shadow-lg">
                            <circle cx="12" cy="12" r="10" stroke="red" strokeWidth="3" fill="none" />
                            <line x1="6" y1="6" x2="18" y2="18" stroke="red" strokeWidth="3" />
                          </svg>
                        </span>
                      </Button>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Admin controls */}
            {isAdmin && (
              <div className="w-full mt-4">
                {status === "ongoing" ? (
                  <div className="w-full text-center py-2 text-yellow-700 bg-yellow-100 rounded font-medium">
                    You cannot update or delete an ongoing event.
                  </div>
                ) : (
                  <div className="flex gap-3 w-full">
                    <Button
                      variant="destructive"
                      className={status === "completed" ? "w-full" : "w-1/2"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      Delete Event
                    </Button>

                    {status !== "completed" && (
                      <Button
                        variant="outline"
                        className="w-1/2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditEvent({
                            title: name,
                            description: description || "",
                            date: formattedDateToInput(formattedDate),
                            time: timeToInput(time),
                            end_time: end_time || "",
                            venue: venue || "",
                            collegeName: collegeName || "",
                            image: image || "",
                            id: id,
                          });
                          setUpdateDialogOpen(true);
                        }}
                      >
                        Update Event
                      </Button>
                    )}
                  </div>
                )}

                {/* Update Event Dialog */}
                <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Event</DialogTitle>
                      <DialogDescription>Edit event details below.</DialogDescription>
                    </DialogHeader>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onUpdate && onUpdate(editEvent, () => setUpdateDialogOpen(false));
                      }}
                      className="space-y-3"
                    >
                      <Label>Title</Label>
                      <Input value={editEvent.title} onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })} required />

                      <Label>Description</Label>
                      <Input value={editEvent.description} onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })} />

                      <Label>Date</Label>
                      <Input type="date" value={editEvent.date} onChange={(e) => setEditEvent({ ...editEvent, date: e.target.value })} required />

                      <Label>Start Time</Label>
                      <Input type="time" value={editEvent.time} onChange={(e) => setEditEvent({ ...editEvent, time: e.target.value })} required />

                      <Label>End Time</Label>
                      <Input type="time" value={editEvent.end_time} onChange={(e) => setEditEvent({ ...editEvent, end_time: e.target.value })} />

                      <Label>Venue</Label>
                      <Input value={editEvent.venue} onChange={(e) => setEditEvent({ ...editEvent, venue: e.target.value })} />

                      <Label>College Name</Label>
                      <Input value={editEvent.collegeName} onChange={(e) => setEditEvent({ ...editEvent, collegeName: e.target.value })} />

                      <Label>Image URL</Label>
                      <Input
                        value={editEvent.image || ""}
                        onChange={(e) => setEditEvent({ ...editEvent, image: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                      />

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="default">
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Event</DialogTitle>
                    </DialogHeader>

                    <div className="mb-4">Are you sure you want to delete <b>{name}</b>? This action cannot be undone.</div>

                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          onDelete && onDelete();
                          setDeleteConfirmOpen(false);
                        }}
                      >
                        Delete
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Details Dialog (opens when the card is clicked) */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {/* Image immediately after title & description */}
            {image && <img src={image} alt={name} className="w-full h-56 object-cover rounded-md" />}

            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{collegeName}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{time}</span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{venue}</span>
            </div>

            {isRegistered && (
              attended ? (
                <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-center">
                  Attendance Marked
                </div>
              ) : (
                (ticketQr || ticketId) ? (
                  <div className="mt-3">
                    <Button
                      className="w-full bg-gradient-hero"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTicket(true);
                      }}
                    >
                      View Ticket
                    </Button>

                    <Dialog open={showTicket} onOpenChange={setShowTicket}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Your Ticket</DialogTitle>
                          <DialogDescription>Show this QR at check-in.</DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-3">
                          {ticketQr ? (
                            <img src={ticketQr} alt="Ticket QR" className="w-64 h-64 object-contain" />
                          ) : (
                            <div className="text-sm text-muted-foreground">Ticket not available</div>
                          )}
                          {ticketId && <div className="text-xs text-muted-foreground">Ticket ID: {ticketId}</div>}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <div className="mt-3">
                    <Button className="w-full opacity-60 cursor-not-allowed" disabled>
                      Ticket pending
                    </Button>
                    <div className="text-xs text-muted-foreground mt-2">Ticket is being generated — check back shortly.</div>
                  </div>
                )
              )
            )}
          </div>

          {/* Registration logic for details dialog (student only) */}
          {!isAdmin ? (
            <div className="mt-4">
              {registered ? (
                (normalizedStatus === "upcoming" || normalizedStatus === "tomorrow") ? (
                  <>
                    <Button
                      className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
                      onClick={handleCancelClick}
                    >
                      Cancel Registration
                    </Button>
                    {/* Cancel Confirmation Dialog */}
                    <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cancel Registration</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to cancel your registration for <b>{name}</b>?
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setCancelConfirmOpen(false)}>
                            No
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              onCancel && onCancel();
                              setCancelConfirmOpen(false);
                            }}
                          >
                            Yes, Cancel
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center mb-2">
                    <Button
                      className="w-full bg-gradient-hero opacity-50 cursor-not-allowed relative"
                      disabled
                      onClick={(e) => e.stopPropagation()}
                    >
                      Cancel Registration
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" strokeWidth="3" className="text-red-600 drop-shadow-lg">
                          <circle cx="12" cy="12" r="10" stroke="red" strokeWidth="3" fill="none" />
                          <line x1="6" y1="6" x2="18" y2="18" stroke="red" strokeWidth="3" />
                        </svg>
                      </span>
                    </Button>
                  </div>
                )
              ) : (
                (normalizedStatus === "upcoming" || normalizedStatus === "tomorrow") ? (
                  <>
                    <Button
                      className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
                      onClick={handleRegisterClick}
                    >
                      Register Now
                    </Button>

                    <StudentRegistration
                      open={studentRegOpen}
                      setOpen={setStudentRegOpen}
                      eventName={name}
                      onRegistered={(student) => {
                        onRegister && onRegister(student);
                      }}
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center mb-2">
                    <Button
                      className="w-full bg-gradient-hero opacity-50 cursor-not-allowed relative"
                      disabled
                      onClick={(e) => e.stopPropagation()}
                    >
                      Register Now
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" strokeWidth="3" className="text-red-600 drop-shadow-lg">
                          <circle cx="12" cy="12" r="10" stroke="red" strokeWidth="3" fill="none" />
                          <line x1="6" y1="6" x2="18" y2="18" stroke="red" strokeWidth="3" />
                        </svg>
                      </span>
                    </Button>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="w-full mt-4">
              {status === "ongoing" ? (
                <div className="w-full text-center py-2 text-yellow-700 bg-yellow-100 rounded font-medium">
                  You cannot update or delete an ongoing event.
                </div>
              ) : (
                <div className="flex gap-3 w-full">
                  <Button
                    variant="destructive"
                    className={status === "completed" ? "w-full" : "w-1/2"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    Delete Event
                  </Button>
                  {status !== "completed" && (
                    <Button
                      variant="outline"
                      className="w-1/2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditEvent({
                          title: name,
                          description: description || "",
                          date: formattedDateToInput(formattedDate),
                          time: timeToInput(time),
                          end_time: end_time || "",
                          venue: venue || "",
                          collegeName: collegeName || "",
                          image: image || "",
                          id: id,
                        });
                        setUpdateDialogOpen(true);
                      }}
                    >
                      Update Event
                    </Button>
                  )}
                </div>
              )}
              {/* Update Event Dialog */}
              <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Event</DialogTitle>
                    <DialogDescription>Edit event details below.</DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onUpdate && onUpdate(editEvent, () => setUpdateDialogOpen(false));
                    }}
                    className="space-y-3"
                  >
                    <Label>Title</Label>
                    <Input value={editEvent.title} onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })} required />
                    <Label>Description</Label>
                    <Input value={editEvent.description} onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })} />
                    <Label>Date</Label>
                    <Input type="date" value={editEvent.date} onChange={(e) => setEditEvent({ ...editEvent, date: e.target.value })} required />
                    <Label>Start Time</Label>
                    <Input type="time" value={editEvent.time} onChange={(e) => setEditEvent({ ...editEvent, time: e.target.value })} required />
                    <Label>End Time</Label>
                    <Input type="time" value={editEvent.end_time} onChange={(e) => setEditEvent({ ...editEvent, end_time: e.target.value })} />
                    <Label>Venue</Label>
                    <Input value={editEvent.venue} onChange={(e) => setEditEvent({ ...editEvent, venue: e.target.value })} />
                    <Label>College Name</Label>
                    <Input value={editEvent.collegeName} onChange={(e) => setEditEvent({ ...editEvent, collegeName: e.target.value })} />
                    <Label>Image URL</Label>
                    <Input
                      value={editEvent.image || ""}
                      onChange={(e) => setEditEvent({ ...editEvent, image: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="default">
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              {/* Delete Confirmation Dialog */}
              <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Event</DialogTitle>
                  </DialogHeader>
                  <div className="mb-4">Are you sure you want to delete <b>{name}</b>? This action cannot be undone.</div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        onDelete && onDelete();
                        setDeleteConfirmOpen(false);
                      }}
                    >
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* DialogFooter intentionally left empty to remove Close button */}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventCard;
