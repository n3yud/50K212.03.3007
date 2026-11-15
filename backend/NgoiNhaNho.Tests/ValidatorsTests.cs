using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Dtos;
using Xunit;

namespace NgoiNhaNho.Tests;

public class ValidatorsTests
{
    [Theory]
    [InlineData("0901234567", true)]
    [InlineData("0987654321", true)]
    [InlineData("0388999888", true)]
    [InlineData("091234567", false)]   // 9 chữ số
    [InlineData("09123456789", false)] // 11 chữ số
    [InlineData("1901234567", false)]  // không bắt đầu bằng số 0
    [InlineData("090abc4567", false)]  // chứa ký tự chữ
    [InlineData("", false)]
    [InlineData(null, false)]
    public void PhoneValidator_ValidatesVietnamese10Digits(string? phone, bool expectedValid)
    {
        var isValid = phone != null && Validators.PhoneRx().IsMatch(phone);
        Assert.Equal(expectedValid, isValid);
    }

    [Theory]
    [InlineData("Nguyễn Gia Hân", true)]
    [InlineData("Lê Minh Anh", true)]
    [InlineData("Trần Thảo Nguyên", true)]
    [InlineData("Bé123", false)]         // chứa số
    [InlineData("Gia-Hân", false)]       // chứa ký tự đặc biệt
    [InlineData("A", false)]             // quá ngắn (< 2 ký tự)
    public void ChildErrors_ValidatesNameRules(string name, bool shouldBeValid)
    {
        var dob = Rules.Today.AddYears(-6).ToString("yyyy-MM-dd");
        var errors = Validators.ChildErrors(name, dob);

        if (shouldBeValid)
        {
            Assert.False(errors.ContainsKey("name"), $"Expected '{name}' to be valid, but had error: {errors.GetValueOrDefault("name")}");
        }
        else
        {
            Assert.True(errors.ContainsKey("name"), $"Expected '{name}' to be invalid");
        }
    }

    [Fact]
    public void ChildErrors_RejectsFutureDateOfBirth()
    {
        var futureDob = Rules.Today.AddDays(1).ToString("yyyy-MM-dd");
        var errors = Validators.ChildErrors("Nguyễn Gia Hân", futureDob);

        Assert.True(errors.ContainsKey("dob"));
        Assert.Equal("Ngày sinh không được sau ngày hiện tại", errors["dob"]);
    }

    [Fact]
    public void StudentErrors_DetectsProgramAgeMismatch()
    {
        // Bé 5 tuổi nhưng chọn chương trình Nâng cao
        var dob5 = Rules.Today.AddYears(-5).ToString("yyyy-MM-dd");
        var req = new StudentRequest(
            FullName: "Nguyễn Gia Hân",
            Dob: dob5,
            Gender: "Nữ",
            ParentName: "Nguyễn Văn Hải",
            ParentPhone: "0901234567",
            Program: "Nâng cao"
        );

        var errors = Validators.StudentErrors(req);
        Assert.True(errors.ContainsKey("program"));
        Assert.Contains("không phù hợp độ tuổi", errors["program"]);
    }
}
