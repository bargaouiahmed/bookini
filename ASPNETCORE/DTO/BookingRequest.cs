using System;

namespace ASPNETCORE.DTO;

public class BookingRequest
{
    public DateTime StartTime {get; set;}
    public DateTime EndTime {get; set;}
    public string Title  {get; set;} = string.Empty;
    public string? Location {get; set;}

    

}
