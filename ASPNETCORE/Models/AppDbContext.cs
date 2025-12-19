using System;
using Microsoft.EntityFrameworkCore;

namespace ASPNETCORE.Models;

public class AppDbContext:DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<CalenderTask> Tasks {get; set;} = null!;
    public DbSet<Booking> Bookings {get; set;} = null!;

    public DbSet<BookingNotification> BookingNotifications {get; set;} = null!;
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();


        modelBuilder.Entity<User>()
        .HasMany(u=> u.CalenderTasks)
        .WithOne(ct => ct.User)
        .HasForeignKey(ct => ct.UserId);

        modelBuilder.Entity<User>()
        .HasMany(u=>u.Bookings)
        .WithOne(b=> b.BookedUser)
        .HasForeignKey(b=>b.BookedUserId);

        modelBuilder.Entity<User>()
        .HasMany(u=>u.BookingsMade)
        .WithOne(b=>b.Booker)
        .HasForeignKey(b => b.BookerId);
        
        modelBuilder.Entity<BookingNotification>()
        .HasOne(bn => bn.Booking)
        .WithMany()
        .HasForeignKey(bn => bn.BookingId)
        .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<BookingNotification>()
        .HasOne(bn => bn.Booker)
        .WithMany()
        .HasForeignKey(bn => bn.BookerId)
        .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<BookingNotification>()
        .HasOne(bn => bn.Booked)    
        .WithMany()
        .HasForeignKey(bn => bn.BookedId)
        .OnDelete(DeleteBehavior.Cascade);

    }

}
