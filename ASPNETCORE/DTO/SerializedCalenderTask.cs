using System;
using ASPNETCORE.Interfaces;

namespace ASPNETCORE.DTO;

public class SerializedCalenderTask : IScheduleItem
{
    public int Id { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? MadeBy { get; set; }
    public string? Status { get; set; } = null; // Tasks don't have status, only bookings
}

/*
import Lombok.Data;
@Data
public class SerializedCalenderTask
{
private DateTime startTime;
private DateTime endTime;
private String title;
}
*/
