using System;

namespace ASPNETCORE.Models;

public class BookingNotification
{
    public int Id {get; set;}
    public required string Message {get; set;}
    public DateTime CreatedAt {get; set;} = DateTime.UtcNow;
    public bool IsRead {get; set;} = false;
    public int BookingId {get; set;}
    public Booking? Booking {get; set;}
    public int BookerId {get; set;}
    public User? Booker {get; set;}
    public int BookedId {get; set;}
    public User? Booked {get; set;}
}
