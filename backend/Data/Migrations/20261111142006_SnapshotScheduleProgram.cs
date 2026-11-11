using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NgoiNhaNho.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SnapshotScheduleProgram : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Program",
                table: "ClassSchedules",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");
            migrationBuilder.Sql("UPDATE v SET v.[Program]=c.[Program] FROM [ClassSchedules] v INNER JOIN [Classes] c ON c.[Id]=v.[ClassId];");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Program",
                table: "ClassSchedules");
        }
    }
}
