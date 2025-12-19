using System;

namespace ASPNETCORE.Interfaces;

public interface IScheduleItem
{
    int Id { get; }
    DateTime StartTime { get; }
    DateTime EndTime { get; }
    string Title { get; }
    string? MadeBy { get; }
    string? Status { get; }
}
