package Common;
# Shared helpers for the carpet-data parsers. Perl is used because this machine
# has neither Python nor Node; Git for Windows ships Perl with JSON::PP.
use strict; use warnings; use utf8;
use Exporter 'import';
use JSON::PP;
use File::Basename qw(dirname);
our @EXPORT = qw(root slurp write_json read_json strip clean decode_ent abs_url);

sub root { return dirname(dirname(__FILE__)) }   # .../carpet-data

sub slurp {
    my ($p) = @_;
    open my $f, '<:raw', $p or die "$p: $!";
    local $/; my $s = <$f>; close $f;
    utf8::decode($s);
    $s =~ s/\r//g;
    return $s;
}

sub read_json { return JSON::PP->new->utf8(0)->decode(slurp($_[0])) }

sub write_json {
    my ($p, $d) = @_;
    open my $f, '>:raw', $p or die "$p: $!";
    print $f JSON::PP->new->utf8->pretty->canonical->indent_length(1)->encode($d);
    close $f;
}

my %ENT = (amp=>'&', lt=>'<', gt=>'>', quot=>'"', apos=>"'", nbsp=>' ', rsquo=>"\x{2019}", lsquo=>"\x{2018}",
    ldquo=>"\x{201C}", rdquo=>"\x{201D}", ndash=>"\x{2013}", mdash=>"\x{2014}", hellip=>"\x{2026}", eacute=>"\x{E9}",
    egrave=>"\x{E8}", agrave=>"\x{E0}", ccedil=>"\x{E7}", deg=>"\x{B0}", sup2=>"\x{B2}", euml=>"\x{EB}", uuml=>"\x{FC}",
    ouml=>"\x{F6}", auml=>"\x{E4}", oelig=>"\x{153}", laquo=>"\x{AB}", raquo=>"\x{BB}", middot=>"\x{B7}");
sub decode_ent {
    my ($s) = @_; return $s unless defined $s;
    $s =~ s/&#(\d+);/chr($1)/ge;
    $s =~ s/&#x([0-9a-fA-F]+);/chr(hex $1)/ge;
    $s =~ s/&([a-zA-Z0-9]+);/exists $ENT{$1} ? $ENT{$1} : "&$1;"/ge;
    return $s;
}
sub clean { my ($s)=@_; return undef unless defined $s; $s=decode_ent($s); $s=~s/\s+/ /g; $s=~s/^ | $//g; return $s }
# Strip tags, keeping paragraph breaks.
sub strip {
    my ($s)=@_; return undef unless defined $s;
    $s =~ s{<br\s*/?>}{\n}gi; $s =~ s{</(p|li|h\d|div)>}{\n}gi; $s =~ s/<[^>]+>//g;
    $s = decode_ent($s);
    $s =~ s/[ \t\x{A0}]+/ /g; $s =~ s/ ?\n ?/\n/g; $s =~ s/\n{2,}/\n\n/g; $s =~ s/^\s+|\s+$//g;
    return $s;
}
sub abs_url {
    my ($base,$u)=@_; return undef unless defined $u; $u=decode_ent($u);
    return $u if $u =~ m{^https?://};
    return "https:$u" if $u =~ m{^//};
    $u = "/$u" unless $u =~ m{^/};
    return $base.$u;
}
1;
