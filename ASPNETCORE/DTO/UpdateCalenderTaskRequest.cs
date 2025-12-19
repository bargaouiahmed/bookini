using System;
using Microsoft.AspNetCore.Components.Web;

namespace ASPNETCORE.DTO;

public class UpdateCalenderTaskRequest
{
    public string? Title {get; set;}
    public DateTime? StartTime {get; set;}
    
    public DateTime? EndTime { get; set; }

}
