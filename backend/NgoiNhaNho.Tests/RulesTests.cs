using NgoiNhaNho.Api.Common;
using Xunit;

namespace NgoiNhaNho.Tests;

public class RulesTests
{
    [Fact]
    public void TuitionFee_ShouldBe900000_ForBothPrograms()
    {
        Assert.Equal(900_000m, Rules.Price["Cơ bản"]);
        Assert.Equal(900_000m, Rules.Price["Nâng cao"]);
    }

    [Fact]
    public void ClassCapacity_Constants_ShouldMatchSpecification()
    {
        Assert.Equal(7, Rules.MaxClass);          // BR-UC7-03: tối đa 7 học viên/lớp
        Assert.Equal(8, Rules.MaxWithMakeup);     // BR-UC3-12: tối đa 8 khi có học bù
        Assert.Equal(2, Rules.MaxMakeup);         // BR-UC3-12: tối đa 2 học viên bù/ca
        Assert.Equal(30, Rules.MakeupDays);       // BR-UC3-08: hạn học bù 30 ngày
    }

    [Theory]
    [InlineData(5, "Cơ bản")]
    [InlineData(6, "Cơ bản")]
    [InlineData(7, "Nâng cao")]
    [InlineData(10, "Nâng cao")]
    [InlineData(15, "Nâng cao")]
    public void SuggestProgram_ValidAges_ReturnsExpectedProgram(int age, string expectedProgram)
    {
        var dob = Rules.Today.AddYears(-age);
        var program = Rules.SuggestProgram(dob);
        Assert.Equal(expectedProgram, program);
    }

    [Theory]
    [InlineData(3)]
    [InlineData(4)]
    [InlineData(16)]
    [InlineData(20)]
    public void SuggestProgram_InvalidAges_ReturnsNull(int age)
    {
        var dob = Rules.Today.AddYears(-age);
        var program = Rules.SuggestProgram(dob);
        Assert.Null(program);
    }

    [Theory]
    [InlineData(1, 3, "17:30", "19:30", true)]   // Thứ 2 - Thứ 4
    [InlineData(2, 4, "17:30", "19:30", true)]   // Thứ 3 - Thứ 5
    [InlineData(6, 0, "07:30", "09:30", true)]   // Thứ 7 - Chủ nhật ca 1
    [InlineData(6, 0, "09:40", "11:40", true)]   // Thứ 7 - Chủ nhật ca 2
    [InlineData(6, 0, "14:30", "16:30", true)]   // Thứ 7 - Chủ nhật ca 3
    [InlineData(6, 0, "17:00", "19:00", true)]   // Thứ 7 - Chủ nhật ca 4
    [InlineData(5, 0, "17:30", "19:30", false)]  // Thứ 6 (trung tâm nghỉ) -> không hợp lệ
    [InlineData(1, 3, "08:00", "10:00", false)]  // Giờ sai -> không hợp lệ
    public void ValidSchedule_ValidatesFixedSchedulePairs(int w1, int w2, string start, string end, bool expectedValid)
    {
        var isValid = Rules.ValidSchedule(w1, w2, start, end);
        Assert.Equal(expectedValid, isValid);
    }

    [Fact]
    public void Overlap_DetectsOverlappingTimes()
    {
        var s1 = new TimeOnly(17, 30);
        var e1 = new TimeOnly(19, 30);
        var s2 = new TimeOnly(18, 00);
        var e2 = new TimeOnly(20, 00);

        Assert.True(Rules.Overlap(s1, e1, s2, e2));
    }

    [Fact]
    public void Overlap_NonOverlappingTimes_ReturnsFalse()
    {
        var s1 = new TimeOnly(7, 30);
        var e1 = new TimeOnly(9, 30);
        var s2 = new TimeOnly(9, 40);
        var e2 = new TimeOnly(11, 40);

        Assert.False(Rules.Overlap(s1, e1, s2, e2));
    }

    [Fact]
    public void Overlap_AdjacentTimes_ReturnsFalse()
    {
        var s1 = new TimeOnly(7, 30);
        var e1 = new TimeOnly(9, 30);
        var s2 = new TimeOnly(9, 30);
        var e2 = new TimeOnly(11, 30);

        Assert.False(Rules.Overlap(s1, e1, s2, e2));
    }
}
