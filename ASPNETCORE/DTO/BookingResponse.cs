using System;
using ASPNETCORE.Interfaces;

namespace ASPNETCORE.DTO;

public class BookingResponse : IScheduleItem
{
    public int Id {get; set;}
    public DateTime StartTime {get; set;}
    public DateTime EndTime {get; set;}
    public string Title {get; set;} = string.Empty;
    public string? Location {get; set;}
    public string? MadeBy {get; set;}
    public string Status {get; set;} = "Pending";
    public bool HasConflict {get; set;} = false;
}
