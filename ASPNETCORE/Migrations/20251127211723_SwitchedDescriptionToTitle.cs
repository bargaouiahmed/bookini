using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ASPNETCORE.Migrations
{
    /// <inheritdoc />
    public partial class SwitchedDescriptionToTitle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Description",
                table: "Bookings",
                newName: "Title");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Title",
                table: "Bookings",
                newName: "Description");
        }
    }
}
