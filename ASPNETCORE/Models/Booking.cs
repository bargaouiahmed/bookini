using System;

namespace ASPNETCORE.Models;

public class Booking
{

    public int Id{get; set;}
    public int BookerId{get;set;}
    public User? Booker{get;set;}
    public int BookedUserId{get;set;}
    public User? BookedUser { get; set; }
    public DateTime StartTime{get;set;}
    public DateTime EndTime{get; set;}

    public string Title {get; set;} = string.Empty;

    public string? Location {get; set;} 

    public string Status {get; set;} = "Pending";
}
