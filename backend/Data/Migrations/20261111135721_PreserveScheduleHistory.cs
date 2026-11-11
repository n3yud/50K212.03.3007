using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NgoiNhaNho.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class PreserveScheduleHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Cancelled",
                table: "Sessions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "End",
                table: "Sessions",
                type: "time",
                nullable: false,
                defaultValue: new TimeOnly(0, 0, 0));

            migrationBuilder.AddColumn<string>(
                name: "Program",
                table: "Sessions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<TimeOnly>(
                name: "Start",
                table: "Sessions",
                type: "time",
                nullable: false,
                defaultValue: new TimeOnly(0, 0, 0));

            migrationBuilder.CreateTable(
                name: "ClassSchedules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClassId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    Weekday = table.Column<int>(type: "int", nullable: false),
                    Start = table.Column<TimeOnly>(type: "time", nullable: false),
                    End = table.Column<TimeOnly>(type: "time", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassSchedules", x => x.Id);
                    table.CheckConstraint("CK_Schedule_Times", "[Weekday] BETWEEN 0 AND 6 AND [Weekday] <> 5 AND [End] > [Start]");
                    table.ForeignKey(
                        name: "FK_ClassSchedules_Classes_ClassId",
                        column: x => x.ClassId,
                        principalTable: "Classes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClassSchedules_ClassId_EffectiveFrom",
                table: "ClassSchedules",
                columns: new[] { "ClassId", "EffectiveFrom" },
                unique: true);
            // Preserve existing schedules by copying their exact values into the
            // dated session snapshots. No rows are deleted or renumbered.
            migrationBuilder.Sql("UPDATE s SET s.[Start]=c.[Start], s.[End]=c.[End], s.[Program]=c.[Program] FROM [Sessions] s INNER JOIN [Classes] c ON c.[Id]=s.[ClassId];");
            migrationBuilder.Sql("INSERT INTO [ClassSchedules] ([Id],[ClassId],[EffectiveFrom],[Weekday],[Start],[End]) SELECT NEWID(),[Id],CONVERT(date,'00010101',112),[Weekday],[Start],[End] FROM [Classes];");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClassSchedules");

            migrationBuilder.DropColumn(
                name: "Cancelled",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "End",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "Program",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "Start",
                table: "Sessions");
        }
    }
}
