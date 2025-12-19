using System;

namespace ASPNETCORE.Models;

public class CalenderTask
{
    public int Id{get; set;}
    public DateTime StartTime{get; set;}
    public DateTime EndTime{get; set;}


    public string Title {get; set;} = string.Empty;

    public int UserId{get; set;}
    public User? User{get; set;}


}
